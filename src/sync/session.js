let currentUser = null;

export function setSyncUser(user) {
    currentUser = user;
}

export function getSyncUser() {
    return currentUser;
}
