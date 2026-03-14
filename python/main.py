from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from datetime import datetime

app = FastAPI(title="Climate Vulnerability API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "status": "Climate Vulnerability API - Microsoft Planetary Computer",
        "version": "1.0.0",
        "data_source": "Microsoft Planetary Computer (STAC)",
        "endpoints": {
            "GET /": "This info",
            "POST /vulnerability": "Calculate vulnerability index"
        }
    }

@app.post("/vulnerability")
async def calculate_vulnerability():
    """
    Calculate climate vulnerability index
    
    This demo returns a sample response. 
    Full processing connects to Planetary Computer STAC API.
    """
    return {
        "success": True,
        "message": "Climate Vulnerability Index - Eastern Sudan",
        "data_source": "Microsoft Planetary Computer",
        "mapId": {
            "id": "vulnerability_index",
            "tileUrlTemplate": "https://tiles.radiantearth.io/styler/terrain/{z}/{x}/{y}",
            "attribution": "Demo - Replace with actual computed tiles"
        },
        "legend": {
            "low": "Low Vulnerability (0-0.33)",
            "moderate": "Moderate Vulnerability (0.33-0.66)",
            "high": "High Vulnerability (0.66-1.0)"
        },
        "info": "Eastern Sudan: Gedaref, Kassala, Sennar, Blue Nile | Period: 2020-2024",
        "indicators": {
            "climate_exposure": "Land Surface Temperature (Landsat)",
            "vegetation_health": "NDVI (Sentinel-2)",
            "rainfall": "ERA5 Reanalysis"
        },
        "methodology": "Vulnerability = Exposure + Sensitivity - Adaptive Capacity",
        "demo": True
    }

@app.get("/status")
async def status():
    """Check API status"""
    return {
        "status": "running",
        "api": "Planetary Computer",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }
