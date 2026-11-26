/* eslint-disable @typescript-eslint/no-empty-object-type -- алиасы интерфейсов обязаны быть пустыми */
import type { JSX as ReactJSX } from 'react';

// React 19 удалил глобальный namespace JSX. Алиас на React.JSX keeps существующие
// сигнатуры компонентов рабочими без массовой правки (~110 мест).
declare global {
  namespace JSX {
    type Element = ReactJSX.Element;
    type ElementType = ReactJSX.ElementType;
    interface ElementClass extends ReactJSX.ElementClass {}
    interface ElementAttributesProperty extends ReactJSX.ElementAttributesProperty {}
    interface ElementChildrenAttribute extends ReactJSX.ElementChildrenAttribute {}
    interface IntrinsicAttributes extends ReactJSX.IntrinsicAttributes {}
    interface IntrinsicClassAttributes<T> extends ReactJSX.IntrinsicClassAttributes<T> {}
    interface IntrinsicElements extends ReactJSX.IntrinsicElements {}
  }
}

export {};
