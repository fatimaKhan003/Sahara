import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export const navigateSafe = (routeName: string, params?: object) => {
  if (navigationRef.isReady()) {
    navigationRef.navigate(routeName as never, params as never);
  }
};

