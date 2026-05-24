//@ts-nocheck

// ============================================================================
// DISPLAY CONFIGURATION
// ============================================================================
const DISPLAY = {
  FPS: 0.5,
  BACKGROUND_TINT_MAX: 0.7,
};

// ============================================================================
// COLOR PALETTES
// ============================================================================
const COLOR_PALETTES = {
  dark: { canvas: "rgb(17, 17, 17)", stem: "rgb(250, 249, 246)" },
  light: { canvas: "rgb(250, 249, 246)", stem: "rgb(17, 17, 17)" },
};

const PETAL_COLORS = {
  yellow: "rgb(251, 194, 109)",
  orange: "rgb(245, 125, 98)",
  red: "rgb(225, 91, 100)",
};

// ============================================================================
// STEM CONFIGURATION
// ============================================================================
const STEM = {
  WEIGHT: 8,
  ANGLE_RANGE: { min: -22.5, max: 22.5 },
  SEGMENTS: { mean: 2.5, stdDev: 3, min: 1, max: 10 },

  lengths: {
    wild: () => random(75, 200),
  },

  // Placeholder for future curve implementations
  curves: {},
};

// ============================================================================
// BULB VARIANTS
// ============================================================================
const BULB = {
  variants: {
    daisy: (position, petalColor) => {
      push();
      noStroke();
      translate(position.x, position.y);
      fill(0);
      circle(0, 0, 20);
      fill(petalColor);
      for (let i = 0; i < 10; i++) {
        ellipse(15, 20, 40, 40);
        rotate(60);
      }
      pop();
    },
  },
};

// ============================================================================
// RANDOM GENERATORS
// ============================================================================
const RandomGen = {
  flowerCount() {
    return floor(random(1, 5));
  },

  colorPalette() {
    return random(Object.keys(COLOR_PALETTES));
  },

  petalColor() {
    return color(random(Object.values(PETAL_COLORS)));
  },

  stemAngle() {
    return random(STEM.ANGLE_RANGE.min, STEM.ANGLE_RANGE.max);
  },

  segmentCount() {
    return floor(
      constrain(
        randomGaussian(STEM.SEGMENTS.mean, STEM.SEGMENTS.stdDev),
        STEM.SEGMENTS.min,
        STEM.SEGMENTS.max,
      ),
    );
  },

  stemLengthType() {
    return random(Object.keys(STEM.lengths));
  },

  bulbType() {
    return random(Object.keys(BULB.variants));
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function getSecondPoint(origin, angle, length) {
  const dx = length * sin(angle);
  const dy = length * cos(angle);
  return {
    x: origin.x + dx,
    y: origin.y - dy,
  };
}

function reflectPoint(point, pivot) {
  return {
    x: pivot.x + (pivot.x - point.x),
    y: pivot.y + (pivot.y - point.y),
  };
}

function randomCanvasPoint() {
  return {
    x: random(0, width),
    y: random(0, height),
  };
}

// ============================================================================
// STEM SEGMENT
// ============================================================================
class StemSegment {
  constructor(a1, c1, c2, a2) {
    this.a1 = a1; // anchor 1 (start point)
    this.c1 = c1; // control point 1
    this.c2 = c2; // control point 2
    this.a2 = a2; // anchor 2 (end point)
  }

  toArray() {
    return [
      this.a1.x,
      this.a1.y,
      this.c1.x,
      this.c1.y,
      this.c2.x,
      this.c2.y,
      this.a2.x,
      this.a2.y,
    ];
  }

  pointAt(t) {
    return {
      x: bezierPoint(this.a1.x, this.c1.x, this.c2.x, this.a2.x, t),
      y: bezierPoint(this.a1.y, this.c1.y, this.c2.y, this.a2.y, t),
    };
  }
}

// ============================================================================
// FLOWER
// ============================================================================
class Flower {
  constructor({ startPosition, currentTint, colorPalette }) {
    // Visual properties
    this.colorPalette = colorPalette;
    this.petalColor = RandomGen.petalColor();
    this.currentTint = currentTint;

    // Structure properties
    this.numSegments = RandomGen.segmentCount();
    this.stemLengthType = RandomGen.stemLengthType();
    this.bulbType = RandomGen.bulbType();

    // Generate the stem
    this.segments = [];
    this.generateSegments(startPosition);
  }

  generateSegments(startPosition) {
    // Create first segment
    const startAngle = RandomGen.stemAngle();
    const length = STEM.lengths[this.stemLengthType]();

    const a1 = startPosition;
    const c1 = getSecondPoint(a1, startAngle, length);
    const a2 = randomCanvasPoint();
    const c2 = randomCanvasPoint();

    this.segments.push(new StemSegment(a1, c1, c2, a2));

    // Generate remaining connected segments
    for (let i = 1; i < this.numSegments; i++) {
      this.addConnectedSegment(this.segments[i - 1]);
    }
  }

  addConnectedSegment(prevSegment) {
    const a1 = prevSegment.a2;
    const c1 = reflectPoint(prevSegment.c2, a1);
    const a2 = randomCanvasPoint();
    const c2 = randomCanvasPoint();

    this.segments.push(new StemSegment(a1, c1, c2, a2));
  }

  getStemColor() {
    const palette = COLOR_PALETTES[this.colorPalette];
    return lerpColor(
      color(palette.stem),
      color(palette.canvas),
      this.currentTint,
    );
  }

  getPetalColor() {
    const palette = COLOR_PALETTES[this.colorPalette];
    return lerpColor(this.petalColor, color(palette.canvas), this.currentTint);
  }

  drawStem() {
    strokeWeight(STEM.WEIGHT);
    stroke(this.getStemColor());
    noFill();

    for (const segment of this.segments) {
      bezier(...segment.toArray());
    }
  }

  drawBulb() {
    const endPoint = this.segments[this.segments.length - 1].a2;
    const petalColor = this.getPetalColor();

    BULB.variants[this.bulbType](endPoint, petalColor);
  }

  draw() {
    this.drawStem();
    this.drawBulb();
  }
}

// ============================================================================
// POSTER GENERATION
// ============================================================================
function newPoster() {
  const numFlowers = RandomGen.flowerCount();
  const colorPalette = RandomGen.colorPalette();
  const bgColor = COLOR_PALETTES[colorPalette].canvas;
  // Set background
  background(bgColor);
  container.style("background-color", bgColor);

  // Generate flowers with depth tinting
  const flowers = [];
  for (let i = numFlowers - 1; i >= 0; i--) {
    const tint =
      numFlowers === 1
        ? 0
        : map(i, 0, numFlowers - 1, 0, DISPLAY.BACKGROUND_TINT_MAX);

    const flower = new Flower({
      startPosition: { x: width / 2, y: height },
      currentTint: tint,
      colorPalette: colorPalette,
    });

    flower.draw();
    flowers.push(flower);
  }

  // Store for debugging
  window.currentPoster = {
    numFlowers,
    colorPalette,
    flowers,
    bgColor,
  };
}

// ============================================================================
// P5.JS SETUP
// ============================================================================
let container;
let resizeTimeout;

function setup() {
  container = select("#sketch-container");
  createCanvas(container.width, container.height);
  select("canvas").parent("sketch-container");

  angleMode(DEGREES);
  frameRate(DISPLAY.FPS);
  newPoster();
}

function windowResized() {
  noLoop();
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    resizeCanvas(container.elt.offsetWidth, container.elt.offsetHeight);
    newPoster();
    loop();
  }, 250);
}

function draw() {
  newPoster();
}

function keyPressed() {
  // Press "s" to save the current poster as a PNG.
  // Date.now() keeps each save unique since draw() regenerates continuously.
  if (key === "s" || key === "S") {
    saveCanvas("semi-florals-" + Date.now(), "png");
  }
}
