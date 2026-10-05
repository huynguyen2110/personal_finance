// URL của module Phát triển bản thân (một bản đồ duy nhất, không cần id trong URL).
export const growthRoutes = {
  plan: '/growth',
  map: '/growth/map',
  todos: '/growth/todos',
  stats: '/growth/stats',
  node: (nodeId: number) => `/growth/nodes/${nodeId}`,
};
