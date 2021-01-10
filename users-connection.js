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

    checkGame(ip, gameName) {
        if (this.checkIp(ip)) {
            return this.#orders[ip].has(gameName);
        }
        return false;
    }

    eliminateOrder(ip, gameName) {
        this.#orders[ip].delete(gameName);
    }

    // checkUser(username) {
    //     return Object.keys(this.#users).find(key => this.#users[key] == username);
    // }

    checkIp(ip) {
        return (Object.keys(this.#users).indexOf(ip) == -1);
    }
};