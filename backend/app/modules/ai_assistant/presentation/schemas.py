from pydantic import BaseModel


class AIQueryRequest(BaseModel):
    company_id: str
    query: str


class AIQueryResponse(BaseModel):
    response: str
    data: dict
    type: str
