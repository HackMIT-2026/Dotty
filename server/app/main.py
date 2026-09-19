from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import treatment_plans

app = FastAPI(title="Dotty API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core demo loop routers, added one step at a time:
# 1 treatment_plans (done), 2 patients, 3 and 4 care_events.
app.include_router(treatment_plans.router)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
