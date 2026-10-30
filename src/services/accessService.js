import { fetchAPI } from './api';

export const accessService = {
  getMyAccess: () => fetchAPI('/security/permissions/my-access'),
};
