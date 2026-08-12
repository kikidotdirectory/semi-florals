import type p5 from "p5";

// p5.js is used in instance mode, the script sourced from p5.js's CDN
declare const p5: new(sketch: (p: p5) => void) => p5;

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
// SKETCH CONTROLS
// ============================================================================
// createSketch fills this in, giving Florals a handle on the closure's
// internals without handing the p5 instance itself to the caller.
type SketchControls = {
	regenerate: () => void;
	pause: () => void;
	resume: () => void;
	isPaused: () => boolean;
};

const createSketch = (container: HTMLElement, controls: SketchControls, onReady: () => void) => (p: p5) => {
	// ============================================================================
	// STEM CONFIGURATION
	// ============================================================================
	const STEM = {
		WEIGHT: 8,
		ANGLE_RANGE: { min: -22.5, max: 22.5 },
		SEGMENTS: { mean: 2.5, stdDev: 3, min: 1, max: 10 },

		lengths: {
			wild: () => p.random(75, 200),
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
				p.push();
				p.noStroke();
				p.translate(position.x, position.y);
				p.fill(0);
				p.circle(0, 0, 20);
				p.fill(petalColor);
				for (let i = 0; i < 10; i++) {
					p.ellipse(15, 20, 40, 40);
					p.rotate(60);
				}
				p.pop();
			},
		},
	};

	// ============================================================================
	// RANDOM GENERATORS
	// ============================================================================
	const RandomGen = {
		flowerCount() {
			return p.floor(p.random(1, 5));
		},

		colorPalette() {
			return p.random(Object.keys(COLOR_PALETTES));
		},

		petalColor() {
			return p.color(p.random(Object.values(PETAL_COLORS)));
		},

		stemAngle() {
			return p.random(STEM.ANGLE_RANGE.min, STEM.ANGLE_RANGE.max);
		},

		segmentCount() {
			return p.floor(
				p.constrain(
					p.randomGaussian(STEM.SEGMENTS.mean, STEM.SEGMENTS.stdDev),
					STEM.SEGMENTS.min,
					STEM.SEGMENTS.max,
				),
			);
		},

		stemLengthType() {
			return p.random(Object.keys(STEM.lengths));
		},

		bulbType() {
			return p.random(Object.keys(BULB.variants));
		},
	};

	// ============================================================================
	// UTILITY FUNCTIONS
	// ============================================================================
	function getSecondPoint(origin, angle, length) {
		const dx = length * p.sin(angle);
		const dy = length * p.cos(angle);
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
			x: p.random(0, p.width),
			y: p.random(0, p.height),
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
				x: p.bezierPoint(this.a1.x, this.c1.x, this.c2.x, this.a2.x, t),
				y: p.bezierPoint(this.a1.y, this.c1.y, this.c2.y, this.a2.y, t),
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
			return p.lerpColor(
				p.color(palette.stem),
				p.color(palette.canvas),
				this.currentTint,
			);
		}

		getPetalColor() {
			const palette = COLOR_PALETTES[this.colorPalette];
			return p.lerpColor(
				this.petalColor,
				p.color(palette.canvas),
				this.currentTint,
			);
		}

		drawStem() {
			p.strokeWeight(STEM.WEIGHT);
			p.stroke(this.getStemColor());
			p.noFill();

			for (const segment of this.segments) {
				p.bezier(...segment.toArray());
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
		p.background(bgColor);
		container.style.backgroundColor = bgColor;

		// Generate flowers with depth tinting
		const flowers = [];
		for (let i = numFlowers - 1; i >= 0; i--) {
			const tint = numFlowers === 1
				? 0
				: p.map(i, 0, numFlowers - 1, 0, DISPLAY.BACKGROUND_TINT_MAX);

			const flower = new Flower({
				startPosition: { x: p.width / 2, y: p.height },
				currentTint: tint,
				colorPalette: colorPalette,
			});

			flower.draw();
			flowers.push(flower);
		}
	}

	// ============================================================================
	// P5.JS SETUP
	// ============================================================================
	let resizeTimeout: ReturnType<typeof setTimeout> | undefined;
	let isSetup = false;
	let paused = false;

	p.setup = () => {
		const canvas = p.createCanvas(
			container.clientWidth,
			container.clientWidth,
		);
		canvas.parent(container);

		p.angleMode(p.DEGREES);
		p.frameRate(DISPLAY.FPS);
		newPoster();

		isSetup = true;
		onReady();
	};

	p.windowResized = () => {
		p.noLoop();
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(() => {
			p.resizeCanvas(container.clientWidth, container.clientWidth);
			newPoster();
			// A resize while paused refits the canvas but must not restart the loop
			if (!paused) p.loop();
		}, 250);
	};

	p.draw = () => {
		newPoster();
	};

	controls.regenerate = () => {
		// Before setup() there is no canvas to draw on, and setup() draws the
		// first poster itself, so there is nothing to regenerate yet.
		if (isSetup) newPoster();
	};

	controls.pause = () => {
		paused = true;
		// Drop any pending resize so it cannot restart the loop after pausing
		clearTimeout(resizeTimeout);
		p.noLoop();
	};

	controls.resume = () => {
		paused = false;
		p.loop();
	};

	controls.isPaused = () => paused;
};

// ============================================================================
// PUBLIC API
// ============================================================================
export class Florals {
	private p: p5;
	private controls: SketchControls;
	private container: HTMLElement;
	private previousBackground: string;
	private destroyed = false;

	/** Resolves once the canvas exists. p5 defers setup() until window load. */
	readonly ready: Promise<void>;

	constructor(container: HTMLElement) {
		this.container = container;
		this.previousBackground = container.style.backgroundColor;

		// createSketch populates this synchronously, inside the p5 constructor
		const controls = {} as SketchControls;
		let onReady: () => void;
		this.ready = new Promise<void>((resolve) => onReady = resolve);

		this.p = new p5(createSketch(container, controls, () => onReady()));
		this.controls = controls;
	}

	get paused(): boolean {
		return this.destroyed ? true : this.controls.isPaused();
	}

	/** Draw a fresh poster immediately, whether running or paused. */
	regenerate(): this {
		this.assertAlive();
		this.controls.regenerate();
		return this;
	}

	/** Stop drawing new posters, leaving the current one on screen. */
	pause(): this {
		this.assertAlive();
		this.controls.pause();
		return this;
	}

	resume(): this {
		this.assertAlive();
		this.controls.resume();
		return this;
	}

	/** Remove the canvas and release the container. Not reusable afterwards. */
	destroy(): void {
		if (this.destroyed) return;
		// pause() first: p5's remove() does not know about our resize timeout
		this.controls.pause();
		this.p.remove();
		this.container.style.backgroundColor = this.previousBackground;
		this.destroyed = true;
	}

	private assertAlive(): void {
		if (this.destroyed) {
			throw new Error("This Florals instance has been destroyed");
		}
	}
}
