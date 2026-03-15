"""
Climate Vulnerability Pre-computation Script
Generates vulnerability index tiles for Eastern Sudan (Gedaref, Kassala, Sennar, Blue Nile)
"""
import json
import os
from pathlib import Path

OUTPUT_DIR = Path("public/data/vulnerability")
TILE_DIR = OUTPUT_DIR / "tiles"

def create_sample_vulnerability_data():
    """Create pre-computed vulnerability data for demo"""
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    TILE_DIR.mkdir(parents=True, exist_ok=True)
    
    metadata = {
        "title": "Climate Vulnerability Index - Eastern Sudan",
        "description": "Pre-computed vulnerability assessment for Gedaref, Kassala, Sennar, Blue Nile",
        "period": "2020-2024",
        "methodology": "Vulnerability = Exposure + Sensitivity - Adaptive Capacity",
        "indicators": {
            "climate_exposure": {
                "name": "Climate Exposure",
                "components": ["Land Surface Temperature (Landsat)", "Rainfall Variability (ERA5)"],
                "weight": 0.25
            },
            "environmental_sensitivity": {
                "name": "Environmental Sensitivity",
                "components": ["NDVI (Sentinel-2)", "Soil Moisture"],
                "weight": 0.25
            },
            "hazard_exposure": {
                "name": "Hazard Exposure",
                "components": ["Flood Susceptibility (DEM)", "Drought Index"],
                "weight": 0.25
            },
            "adaptive_capacity": {
                "name": "Adaptive Capacity",
                "components": ["Population Density", "Infrastructure"],
                "weight": -0.25
            }
        },
        "classification": {
            "low": {"min": 0, "max": 0.33, "color": "#22c55e", "label": "Low Vulnerability"},
            "moderate": {"min": 0.33, "max": 0.66, "color": "#eab308", "label": "Moderate Vulnerability"},
            "high": {"min": 0.66, "max": 1.0, "color": "#ef4444", "label": "High Vulnerability"}
        },
        "study_area": {
            "country": "Sudan",
            "states": ["Gedaref", "Kassala", "Sennar", "Blue Nile"],
            "bbox": [32.0, 9.0, 37.0, 16.0]
        },
        "data_source": "Microsoft Planetary Computer (Sentinel-2, Landsat, ERA5)",
        "generated": "2024-01-15"
    }
    
    with open(OUTPUT_DIR / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)
    
    state_data = {
        "gedaref": {
            "name": "Gedaref",
            "vulnerability_score": 0.65,
            "classification": "high",
            "indicators": {
                "climate_exposure": 0.72,
                "environmental_sensitivity": 0.68,
                "hazard_exposure": 0.55,
                "adaptive_capacity": 0.45
            },
            "center": [14.05, 35.38]
        },
        "kassala": {
            "name": "Kassala",
            "vulnerability_score": 0.58,
            "classification": "moderate",
            "indicators": {
                "climate_exposure": 0.61,
                "environmental_sensitivity": 0.55,
                "hazard_exposure": 0.70,
                "adaptive_capacity": 0.50
            },
            "center": [15.45, 36.40]
        },
        "sennar": {
            "name": "Sennar",
            "vulnerability_score": 0.45,
            "classification": "moderate",
            "indicators": {
                "climate_exposure": 0.48,
                "environmental_sensitivity": 0.42,
                "hazard_exposure": 0.52,
                "adaptive_capacity": 0.60
            },
            "center": [13.55, 33.60]
        },
        "blue_nile": {
            "name": "Blue Nile",
            "vulnerability_score": 0.38,
            "classification": "low",
            "indicators": {
                "climate_exposure": 0.35,
                "environmental_sensitivity": 0.32,
                "hazard_exposure": 0.58,
                "adaptive_capacity": 0.65
            },
            "center": [11.50, 34.50]
        }
    }
    
    with open(OUTPUT_DIR / "states.json", "w") as f:
        json.dump(state_data, f, indent=2)
    
    print(f"Created pre-computed data in {OUTPUT_DIR}")
    print(f"  - metadata.json")
    print(f"  - states.json")
    print(f"  - tiles/ (directory for map tiles)")

if __name__ == "__main__":
    create_sample_vulnerability_data()
