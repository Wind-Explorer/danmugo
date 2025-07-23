import { useEffect, useRef, useState } from "preact/hooks";
import { sampleComments, commentColors } from "./resources";

interface DanmuComment {
  id: number;
  text: string;
  top: number;
  color: string;
  speed: number; // px per second
  fontSize: number;
  track: number;
  x: number; // current X position (pixels)
  width: number; // width of the text (pixels)
}

const TRACKS = 10;
const TARGET_FPS = 30;
const FRAME_DURATION = 1000 / TARGET_FPS;

export default function Danmu() {
  const [comments, setComments] = useState<DanmuComment[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const commentIdRef = useRef(0);
  const trackStatus = useRef<boolean[]>(Array(TRACKS).fill(false));
  const running = useRef(true);

  // Helper: get available track
  const getRandomTrack = () => {
    const available = trackStatus.current
      .map((used, idx) => (!used ? idx : -1))
      .filter((idx) => idx !== -1);
    if (available.length === 0) return Math.floor(Math.random() * TRACKS);
    return available[Math.floor(Math.random() * available.length)];
  };

  // Helper: create a new DanmuComment
  const getRandomComment = (): DanmuComment => {
    const containerHeight = containerRef.current?.clientHeight || 600;
    const containerWidth = containerRef.current?.clientWidth || 800;
    const track = getRandomTrack();
    const trackHeight = containerHeight / TRACKS;
    // Estimate width (will be corrected on mount)
    const text =
      sampleComments[Math.floor(Math.random() * sampleComments.length)];
    const fontSize = 14 + Math.random() * 8;
    return {
      id: ++commentIdRef.current,
      text,
      top: track * trackHeight + 4,
      color: commentColors[Math.floor(Math.random() * commentColors.length)],
      speed: containerWidth / (8 + Math.random() * 12), // px/sec, matches 8-20s crossing time
      fontSize,
      track,
      x: containerWidth, // start from right edge
      width: 200, // initial guess, will update after mount
    };
  };

  // Add comments at random intervals
  useEffect(() => {
    let timeouts: number[] = [];
    function spawn() {
      const newComment = getRandomComment();
      trackStatus.current[newComment.track] = true;
      setComments((prev) => [...prev, newComment]);
      // Schedule next spawn
      const next = 500 + Math.random() * 1500;
      const timeout = window.setTimeout(spawn, next);
      timeouts.push(timeout);
    }
    spawn();
    return () => timeouts.forEach(clearTimeout);
  }, []);

  // Main animation loop (30Hz)
  useEffect(() => {
    running.current = true;
    let lastFrame = performance.now();

    function loop(now: number) {
      if (!running.current) return;
      if (now - lastFrame >= FRAME_DURATION) {
        setComments((prev) => {
          return prev
            .map((c) => {
              // Move left
              const delta = (c.speed * (now - lastFrame)) / 1000;
              return { ...c, x: c.x - delta };
            })
            .filter((c) => {
              // Remove if out of screen
              if (c.x + c.width < 0) {
                trackStatus.current[c.track] = false;
                return false;
              }
              return true;
            });
        });
        lastFrame = now;
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    return () => {
      running.current = false;
    };
  }, []);

  // On mount, measure comment width for accurate removal
  useEffect(() => {
    comments.forEach((comment) => {
      const el = document.getElementById(`danmu-${comment.id}`);
      if (el && el.offsetWidth !== comment.width) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === comment.id ? { ...c, width: el.offsetWidth } : c,
          ),
        );
      }
    });
  }, [comments]);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 pointer-events-none">
        {comments.map((comment) => (
          <div
            key={comment.id}
            id={`danmu-${comment.id}`}
            className="absolute whitespace-nowrap text-2xl font-bold select-none danmu-font text-white stroked-text"
            style={{
              transform: `translateX(${comment.x}px)`,
              top: comment.top,
              willChange: "transform",
              pointerEvents: "none",
            }}
          >
            {comment.text}
          </div>
        ))}
      </div>
      <style>
        {`
        .danmu-font {
          font-family: system-ui, -apple-system, sans-serif;
        }
        `}
      </style>
    </div>
  );
}
