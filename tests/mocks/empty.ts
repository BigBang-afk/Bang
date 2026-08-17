// Stands in for the "server-only" marker package during tests. That
// package intentionally throws unless the bundler sets the "react-server"
// export condition (which only Next.js's build does); Vitest runs in plain
// Node, so we alias it to this no-op instead of flipping a global resolve
// condition that could change how other packages (e.g. react itself)
// resolve.
export {};
