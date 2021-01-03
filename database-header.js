class DatabaseHeaders {
    static #users = [
            'username',
            'email',
            'device',
            'password',
            'ip'
    ];

    static #games = [
            'game_name',
            'price',
            'genre'
    ];

    static #genres = [
        'genre'
    ];

    static #orders = [
        'id_order',
        'card_number',
        'expiration_date',
        'cvv',
        'id_device',
        'username',
        'game_name'
    ];

    static #users_games = [
        'id',
        'username',
        'game_name'
    ];

    static #device_type = [
        'device'
    ];

    static #registered_devices = [
        'id_device'
    ];

    static #users_devices = [
        'id_device',
        'username'
    ];

    static getTable(option) {
        let table;
        let tableName;

        if (option == 1) {
            table = this.#users;
            tableName = 'users';
        }
        else if (option == 2) {
            table = this.#games;
            tableName = 'games';
        }
        else if (option == 3) {
            table = this.#genres;
            tableName = 'genres';
        }
        else if (option == 4) {
            table = this.#orders;
            tableName = 'orders';
        }
        else if (option == 5) {
            table = this.#users_games;
            tableName = 'users_games';
        }
        else if (option == 6) {
            table = this.#device_type;
            tableName = 'device_type';
        }
        else if (option == 7) {
            table = this.#registered_devices;
            tableName = 'registered_devices';
        }
        else if (option == 8) {
            table = this.#users_devices;
            tableName = 'users_devices';
        }

        return [tableName, table];
    }
};

module.exports = DatabaseHeaders;