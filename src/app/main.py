from fastapi import FastAPI
from app.routers import notes, paths, progress

app = FastAPI(
    title="Synaptiq API",
    description="Your personal learning brain — capture, structure, and track everything you learn.",
    version="0.1.0",
)

app.include_router(notes.router)
app.include_router(paths.router)
app.include_router(progress.router)


@app.get("/")
def root():
    return {"message": "Welcome to Synaptiq 🧠"}
