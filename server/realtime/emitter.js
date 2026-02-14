let ioInstance = null;

export const setIO = (io) => {
	ioInstance = io;
};

export const getIO = () => ioInstance;

export const emitToUser = (userId, event, payload) => {
	if (!ioInstance) return;
	ioInstance.to(`user:${Number(userId)}`).emit(event, payload);
};
