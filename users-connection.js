module.exports = class UsersConnected {
    #users = {};
    #orders = {};

    addUser(ip, username) {
        if (Object.keys(this.#users).indexOf(ip) == -1) {
            this.#users[ip] = username;
        }
    }

    getUsers() {
        return this.#users;
    }

    getOrders() {
        return this.#orders;
    }

    executeOrder(ip, gameName) {
        if (Object.keys(this.#orders).indexOf(ip) == -1) {
            this.#orders[ip] = new Set();
            this.#orders[ip].add(gameName);
        }
        else {
            this.#orders[ip].add(gameName);
        }
    }

    eliminateOrder(ip, gameName) {
        this.#orders[ip].delete(gameName);
    }
};