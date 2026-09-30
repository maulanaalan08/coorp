export const createLatestRequestGuard = () => {
  let currentRequestId = 0;

  return {
    begin(projectId) {
      currentRequestId += 1;
      return { projectId, requestId: currentRequestId };
    },
    isCurrent(token, projectId) {
      return Boolean(token) && token.requestId === currentRequestId && token.projectId === projectId;
    },
    invalidate() {
      currentRequestId += 1;
    },
  };
};
