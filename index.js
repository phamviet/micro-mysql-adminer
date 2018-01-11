const mysql = require('promise-mysql');
const {json, send, sendError} = require('micro');

const pool = mysql.createPool({
    connectionLimit: 2,
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 3306
});

/**
 * handle CREATE requests
 */
async function createHandler(req) {
    const { dry, db_name, db_user, db_password } = await json(req);
    const conn = await pool.getConnection();

    await conn.beginTransaction();

    try {
        await conn.query(`CREATE DATABASE ${pool.escapeId(db_name)}`);
        await conn.query(`CREATE USER ${pool.escape(db_user)}@${pool.escape('%')} IDENTIFIED BY ?`, db_password);
        await conn.query(`GRANT ALL PRIVILEGES ON ${pool.escapeId(db_name)}.* TO ${pool.escape(db_user)}@${pool.escape('%')}`);
        await conn.commit();
    } catch (error) {
        await conn.rollback();
        throw error;
    }

    await conn.release();

    if (dry) {
        return deleteHandler(req);
    }

    return { db_name, db_user, db_password };
}

/**
 * handle DELETE requests
 */
async function deleteHandler(req) {
    const { db_name, db_user } = await json(req);

    if (db_name) {
        await pool.query(`DROP DATABASE IF EXISTS ${pool.escapeId(db_name)}`);
        await pool.query(`DROP USER IF EXISTS ${pool.escape(db_user)}@${pool.escape('%')}`);
    }

    return {
        success: true
    };
}

async function execute(req, res) {
    try {
        switch (req.method) {
            case 'POST':
                return await createHandler(req);
            case 'DELETE':
                return await deleteHandler(req);
            default:
                send(res, 405, 'Invalid method');
                break;
        }
    } catch (error) {
        throw error;
    }
}

module.exports = async (req, res) => {
    try {
        send(res, 200, await execute(req, res));
    } catch (error) {
        sendError(req, res, error);
    }
}
