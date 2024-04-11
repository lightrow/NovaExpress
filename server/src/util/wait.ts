const wait = (timeout: number) => {
    return new Promise<void>(resolve => {
        setTimeout(() => {
            resolve();
        }, timeout);
    });
};

export default wait;
