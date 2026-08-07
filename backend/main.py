from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def home():
    return {"message": "Recruitment Platform Backend is Running"}