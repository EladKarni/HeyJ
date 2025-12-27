declare module 'react-native-shared-element' {
  import { Component, ReactNode } from 'react';
  import { Animated, ViewStyle } from 'react-native';

  export interface SharedElementNode {
    // Internal node reference used by react-native-shared-element
    isParent?: boolean;
    ref?: any;
  }

  export interface SharedElementAnimatedValue {
    x: Animated.Value;
    y: Animated.Value;
    width: Animated.Value;
    height: Animated.Value;
  }

  export interface SharedElementTransitionProps {
    start: {
      node: SharedElementNode | null;
      ancestor: SharedElementNode | null;
    };
    end: {
      node: SharedElementNode | null;
      ancestor: SharedElementNode | null;
    };
    position: Animated.Value;
    animation?: 'move' | 'fade' | 'fade-in' | 'fade-out';
    resize?: 'auto' | 'stretch' | 'clip' | 'none';
    align?: 'auto' | 'top-left' | 'top-center' | 'top-right' | 'left-center' | 'center' | 'right-center' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    style?: ViewStyle;
  }

  export class SharedElementTransition extends Component<SharedElementTransitionProps> {}

  export interface SharedElementProps {
    id: string;
    children: ReactNode;
  }

  export class SharedElement extends Component<SharedElementProps> {}
}
