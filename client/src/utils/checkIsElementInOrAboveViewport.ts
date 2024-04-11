export const checkIsElementInOrAboveViewport = (el: HTMLElement) => {
    const {top, bottom} = el.getBoundingClientRect();
    const {innerHeight} = window;

    return (top > 0 && top < innerHeight) || bottom < 0;
};
