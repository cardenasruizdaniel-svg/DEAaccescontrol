import base64
import json
import os
from typing import Any

from fastapi import HTTPException, status

from app.core.config import settings
from app.modules.facial_recognition.infrastructure.repositories import FaceRepository


class FacialRecognitionService:
    def __init__(self, face_repo: FaceRepository) -> None:
        self.face_repo = face_repo

    async def register_face(self, employee_id: str, photo_base64: str) -> dict:
        employee = await self.face_repo.get_employee_with_face(employee_id)
        if not employee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

        try:
            import face_recognition
            import numpy as np
            photo_bytes = base64.b64decode(photo_base64)
            temp_path = f"/tmp/face_{employee_id}.jpg"
            with open(temp_path, "wb") as f:
                f.write(photo_bytes)
            image = face_recognition.load_image_file(temp_path)
            encodings = face_recognition.face_encodings(image)
            os.unlink(temp_path)
            if not encodings:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No face detected in the photo")
            encoding_json = json.dumps(encodings[0].tolist())
            await self.face_repo.update_face_encoding(employee_id, encoding_json)
            return {"message": "Face registered successfully", "encoding_length": len(encodings[0])}
        except ImportError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Servicio de reconocimiento facial no disponible. Contacte al administrador.",
            )

    async def verify_face(self, employee_id: str, photo_base64: str) -> dict:
        employee = await self.face_repo.get_employee_with_face(employee_id)
        if not employee or not employee.facial_encoding:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Face not registered for this employee")

        try:
            import face_recognition
            import numpy as np
            known_encoding = json.loads(employee.facial_encoding)
            known_enc = np.array(known_encoding)

            photo_bytes = base64.b64decode(photo_base64)
            temp_path = f"/tmp/verify_{employee_id}.jpg"
            with open(temp_path, "wb") as f:
                f.write(photo_bytes)
            image = face_recognition.load_image_file(temp_path)
            encodings = face_recognition.face_encodings(image)
            os.unlink(temp_path)

            if not encodings:
                return {"verified": False, "score": 0.0, "message": "No face detected"}

            distance = face_recognition.face_distance([known_enc], encodings[0])[0]
            match = distance <= settings.FACE_RECOGNITION_TOLERANCE
            score = round(1.0 - distance, 4)
            return {"verified": match, "score": score, "message": "Face matched" if match else "Face does not match"}
        except ImportError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Servicio de reconocimiento facial no disponible. Contacte al administrador.",
            )

    async def detect_liveness(self, photo_base64: str) -> dict:
        try:
            import cv2
            import numpy as np
            photo_bytes = base64.b64decode(photo_base64)
            nparr = np.frombuffer(photo_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
            faces = face_cascade.detectMultiScale(gray, 1.3, 5)
            return {"liveness_detected": len(faces) > 0, "faces_found": len(faces)}
        except ImportError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Servicio de detección de actividad no disponible. Contacte al administrador.",
            )

    async def anti_fraud_check(self, latitude: float, longitude: float, is_mock_location: bool) -> dict:
        alerts = []
        if is_mock_location:
            alerts.append("MOCK_LOCATION_DETECTED")
        return {"passed": len(alerts) == 0, "alerts": alerts}
