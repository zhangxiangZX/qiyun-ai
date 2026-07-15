# Resize launcher PNGs: remove white background, crop, and build sprite sheet.
param(
  [string]$SourceDir = "$PSScriptRoot\..\src\assets\launcher\source",
  [string]$OutDir = "$PSScriptRoot\..\src\assets\launcher",
  [int]$FrameSize = 144,
  [int]$WhiteThreshold = 238,
  [int]$WhiteNeutralDelta = 18
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$frames = @(
  "frame-1-idle.png",
  "frame-2-ai.png",
  "frame-3-ai-glow.png",
  "frame-4-typing.png"
)

function Test-IsBackgroundPixel([System.Drawing.Color]$color) {
  if ($color.A -lt 8) { return $true }
  $min = [Math]::Min($color.R, [Math]::Min($color.G, $color.B))
  $max = [Math]::Max($color.R, [Math]::Max($color.G, $color.B))
  return ($min -ge $WhiteThreshold -and ($max - $min) -le $WhiteNeutralDelta)
}

function Get-BackgroundAlpha([System.Drawing.Color]$color) {
  if ($color.A -lt 8) { return 0 }
  $min = [Math]::Min($color.R, [Math]::Min($color.G, $color.B))
  $max = [Math]::Max($color.R, [Math]::Max($color.G, $color.B))
  if ($min -ge $WhiteThreshold -and ($max - $min) -le $WhiteNeutralDelta) { return 0 }

  $edgeStart = $WhiteThreshold - 24
  if ($min -ge $edgeStart -and ($max - $min) -le ($WhiteNeutralDelta + 8)) {
    $fade = [Math]::Min(1.0, ($min - $edgeStart) / 24.0)
    return [int]([Math]::Max(0, (1.0 - $fade) * 255))
  }

  return [int]$color.A
}

function ConvertToTransparentBitmap([System.Drawing.Bitmap]$source) {
  $bitmap = New-Object System.Drawing.Bitmap $source.Width, $source.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  for ($y = 0; $y -lt $source.Height; $y++) {
    for ($x = 0; $x -lt $source.Width; $x++) {
      $color = $source.GetPixel($x, $y)
      $alpha = Get-BackgroundAlpha $color
      if ($alpha -le 0) {
        $bitmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
      } elseif ($alpha -lt 255) {
        $bitmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $color.R, $color.G, $color.B))
      } else {
        $bitmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($color.R, $color.G, $color.B))
      }
    }
  }
  return $bitmap
}

function Get-ContentBounds([System.Drawing.Bitmap]$bitmap) {
  $minX = $bitmap.Width
  $minY = $bitmap.Height
  $maxX = 0
  $maxY = 0
  $found = $false

  for ($y = 0; $y -lt $bitmap.Height; $y++) {
    for ($x = 0; $x -lt $bitmap.Width; $x++) {
      if ($bitmap.GetPixel($x, $y).A -gt 16) {
        $found = $true
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }

  if (-not $found) {
    return @{ X = 0; Y = 0; Width = $bitmap.Width; Height = $bitmap.Height }
  }

  $pad = [Math]::Max(2, [int]([Math]::Min($bitmap.Width, $bitmap.Height) * 0.01))
  $x0 = [Math]::Max(0, $minX - $pad)
  $y0 = [Math]::Max(0, $minY - $pad)
  $x1 = [Math]::Min($bitmap.Width - 1, $maxX + $pad)
  $y1 = [Math]::Min($bitmap.Height - 1, $maxY + $pad)
  return @{
    X = $x0
    Y = $y0
    Width = ($x1 - $x0 + 1)
    Height = ($y1 - $y0 + 1)
  }
}

function New-SquareFrame([System.Drawing.Bitmap]$source, [System.Drawing.Rectangle]$bounds, [int]$size) {
  $target = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($target)
  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $maxSide = [Math]::Max($bounds.Width, $bounds.Height)
    $drawSize = [Math]::Min($size - 8, [int][Math]::Round($size * 0.92))
    $scale = $drawSize / [double]$maxSide
    $drawWidth = [int][Math]::Round($bounds.Width * $scale)
    $drawHeight = [int][Math]::Round($bounds.Height * $scale)
    $offsetX = [int][Math]::Round(($size - $drawWidth) / 2.0)
    $offsetY = [int][Math]::Round(($size - $drawHeight) / 2.0)

    $graphics.DrawImage(
      $source,
      (New-Object System.Drawing.Rectangle $offsetX, $offsetY, $drawWidth, $drawHeight),
      $bounds,
      [System.Drawing.GraphicsUnit]::Pixel
    )
  } finally {
    $graphics.Dispose()
  }
  return $target
}

function Save-Bitmap([System.Drawing.Bitmap]$bitmap, [string]$path) {
  $dir = Split-Path $path -Parent
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

$resized = New-Object System.Collections.Generic.List[System.Drawing.Bitmap]
try {
  foreach ($name in $frames) {
    $path = Join-Path $SourceDir $name
    if (-not (Test-Path $path)) {
      throw "Missing source frame: $path"
    }

    $loaded = [System.Drawing.Image]::FromFile($path)
    try {
      $sourceBitmap = New-Object System.Drawing.Bitmap $loaded
      $transparent = ConvertToTransparentBitmap $sourceBitmap
      $sourceBitmap.Dispose()
      $bounds = Get-ContentBounds $transparent
      $rect = New-Object System.Drawing.Rectangle $bounds.X, $bounds.Y, $bounds.Width, $bounds.Height
      $frame = New-SquareFrame $transparent $rect $FrameSize
      $transparent.Dispose()
      [void]$resized.Add($frame)
      Write-Host ("processed {0}" -f $name)
    } finally {
      $loaded.Dispose()
    }
  }

  $spriteWidth = $FrameSize * $resized.Count
  $sprite = New-Object System.Drawing.Bitmap $spriteWidth, $FrameSize, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $spriteGraphics = [System.Drawing.Graphics]::FromImage($sprite)
  try {
    $spriteGraphics.Clear([System.Drawing.Color]::Transparent)
    for ($i = 0; $i -lt $resized.Count; $i++) {
      $spriteGraphics.DrawImage($resized[$i], ($i * $FrameSize), 0, $FrameSize, $FrameSize)
    }
  } finally {
    $spriteGraphics.Dispose()
  }

  $spritePath = Join-Path $OutDir "launcher-sprite.png"
  Save-Bitmap $sprite $spritePath
  Write-Host ("sprite -> {0} ({1}x{2})" -f $spritePath, $spriteWidth, $FrameSize)
} finally {
  foreach ($bitmap in $resized) {
    $bitmap.Dispose()
  }
}

Get-ChildItem $OutDir -Filter launcher-sprite.png | ForEach-Object {
  Write-Host ("  {0} {1} KB" -f $_.Name, [math]::Round($_.Length / 1KB, 1))
}
