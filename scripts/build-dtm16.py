"""Encode the Aseer DTM GeoTIFF as a 16-bit heightmap PNG for the 3D mosque viewer.

Heights are scaled min..max -> 0..65535 and stored as R * 256 + G (B = 0),
since browsers only decode 8 bits per channel. Nodata cells are filled by
interpolation first so the terrain has no pits.

    python3 scripts/build-dtm16.py "3d/data/Aseer - DTM.tif" public/data/3d/dtm16.png
"""
import sys

import numpy as np
from osgeo import gdal
from PIL import Image

gdal.UseExceptions()

src, dst = sys.argv[1], sys.argv[2]
ds = gdal.Translate('', src, format='MEM')
band = ds.GetRasterBand(1)
gdal.FillNodata(band, None, maxSearchDist=500, smoothingIterations=0)
heights = band.ReadAsArray().astype(np.float64)
nodata = band.GetNoDataValue()
valid = heights != nodata if nodata is not None else np.ones_like(heights, bool)
lo, hi = heights[valid].min(), heights[valid].max()
heights[~valid] = lo

v = np.round((heights - lo) / (hi - lo) * 65535).astype(np.uint32)
rgb = np.zeros(heights.shape + (3,), np.uint8)
rgb[..., 0] = v >> 8
rgb[..., 1] = v & 0xFF
Image.fromarray(rgb, 'RGB').save(dst, optimize=True)
print(f'{dst}: {heights.shape[1]}x{heights.shape[0]}, {lo:.2f} m .. {hi:.2f} m (range {hi - lo:.2f} m), {(~valid).mean():.4%} unfilled')
