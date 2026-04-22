export function useProtectedRoute() {
  return {
    isLoading: false,
    isAuthorized: true,
    user: null,
  };
}