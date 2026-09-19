from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import db
from .routers import auth, dose, notifications, pet, patients, simulator, sync
from .services import alerts, shop


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.ensure_indexes()
    shop.ensure_items()
    alerts.start_scheduler()
    yield


app = FastAPI(title="Dotty API", version="0.1.0", lifespan=lifespan)

# Demo setup: the Expo web build and the clinician portal run on other origins.
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

for module in (auth, sync, patients, dose, pet, notifications, simulator):
    app.include_router(module.router)


@app.get("/health")
def health():
    db.client.admin.command("ping")
    return {"ok": True}
