from fastapi import HTTPException, status
from app.modules.ai_assistant.infrastructure.repositories import AIRepository


class AIAssistantService:
    def __init__(self, repo: AIRepository) -> None:
        self.repo = repo

    async def process_query(self, company_id: str, query: str) -> dict:
        q_lower = query.lower()

        if any(w in q_lower for w in ["buscar empleado", "search employee", "encontrar empleado"]):
            search_term = query.split(":", 1)[-1].strip() if ":" in query else query
            employees = await self.repo.search_employees(company_id, search_term)
            return {
                "response": f"Found {len(employees)} employees matching '{search_term}'",
                "data": [
                    {"id": e.id, "code": e.code, "name": f"{e.first_name} {e.last_name}", "status": e.status}
                    for e in employees
                ],
                "type": "search_result",
            }

        if any(w in q_lower for w in ["ausencias", "absences", "faltas"]):
            anomalies = await self.repo.detect_anomalies(company_id)
            return {
                "response": f"Found {len(anomalies)} potential attendance anomalies",
                "data": anomalies,
                "type": "anomaly_detection",
            }

        if any(w in q_lower for w in ["productividad", "productivity", "rendimiento"]):
            return {
                "response": "Productivity analysis based on attendance patterns and shift completion rates",
                "data": {"recommendation": "Review dashboard for detailed metrics"},
                "type": "analysis",
            }

        if any(w in q_lower for w in ["prediccion", "prediction", "predecir", "forecast"]):
            return {
                "response": "Based on historical patterns, the system can predict likely absences using attendance trends. Consider implementing automated alerts for employees with declining punctuality rates.",
                "data": {"suggestion": "Enable automated attendance monitoring"},
                "type": "prediction",
            }

        if any(w in q_lower for w in ["rutas", "routes", "optimizar"]):
            return {
                "response": "Route optimization analyzes GPS data to find efficient paths between assigned locations. The system considers traffic patterns, distance, and appointment schedules.",
                "data": {"suggestion": "Enable route tracking for field employees"},
                "type": "optimization",
            }

        return {
            "response": f"I can help with: searching employees, analyzing attendance, detecting anomalies, predicting absences, and optimizing routes. Please try a more specific query.",
            "data": {},
            "type": "info",
        }

    async def get_insights(self, company_id: str) -> dict:
        anomalies = await self.repo.detect_anomalies(company_id)
        return {
            "anomalies_detected": len(anomalies),
            "top_issues": anomalies[:5],
            "recommendations": [
                "Review employees with frequent lateness",
                "Implement automated attendance alerts",
                "Consider flexible scheduling for chronic latecomers",
                "Review geofence settings for field employees",
            ],
        }
