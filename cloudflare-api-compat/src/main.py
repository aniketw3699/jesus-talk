from workers import WorkerEntrypoint
from fastapi import FastAPI
import asgi

# Import the critical packages used by the existing backend. This probe exists
# only to prove whether the dependency graph can be bundled by Python Workers.
import firebase_admin
from groq import Groq
import httpx
from pydantic import BaseModel

app = FastAPI()


class Probe(BaseModel):
    message: str = "ok"


@app.get("/")
async def root():
    return {
        "ok": True,
        "fastapi": True,
        "firebase_admin": firebase_admin is not None,
        "groq": Groq is not None,
        "httpx": httpx is not None,
        "pydantic": Probe(message="ok").message == "ok",
    }


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        return await asgi.fetch(app, request, self.env)
