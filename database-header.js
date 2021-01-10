module.exports = class DatabaseHeaders {
    static #tables = {
        1 : ['users', ['username', 'email', 'device', 'password', 'ip']],
        2 : ['games', ['game_name', 'price', 'genre', 'quantity']],
        3 : ['genres', ['genre']],
        4 : ['orders', 
            ['id_order', 'card_number', 'expiration_date', 'cvv', 'id_device', 'username', 'game_name']
            ],
        5 : ['users_games', ['id', 'username', 'game_name']],
        6 : ['devices', ['device']],
        7 : ['registered_devices', ['id_device']],
        8 : ['users_devices', ['id_device', 'username']]
    };

    static getTable(option) {
        if (option >= 1 && option <= 8) {
            return this.#tables[option];
        }
        return [undefined, undefined];
    }
};