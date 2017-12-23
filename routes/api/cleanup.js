"use strict";

const express = require('express');
const router = express.Router();
const sql = require('../../services/sql');
const utils = require('../../services/utils');
const sync_table = require('../../services/sync_table');

router.post('/cleanup-soft-deleted-items', async (req, res, next) => {
    await sql.doInTransaction(async () => {
        const noteIdsToDelete = await sql.getFlattenedResults("SELECT note_id FROM notes WHERE is_deleted = 1");
        const noteIdsSql = noteIdsToDelete
            .map(noteId => "'" + utils.sanitizeSql(noteId) + "'")
            .join(', ');

        console.log("Note IDS for deletion", noteIdsSql);

        await sql.execute(`DELETE FROM event_log WHERE note_id IN (${noteIdsSql})`);

        await sql.execute(`DELETE FROM notes_history WHERE note_id IN (${noteIdsSql})`);

        await sql.execute("DELETE FROM notes_tree WHERE is_deleted = 1");

        await sql.execute("DELETE FROM notes WHERE is_deleted = 1");

        await sql.execute("DELETE FROM recent_notes");

        await sync_table.cleanupSyncRowsForMissingEntities("notes", "note_id");
        await sync_table.cleanupSyncRowsForMissingEntities("notes_tree", "note_tree_id");
        await sync_table.cleanupSyncRowsForMissingEntities("notes_history", "note_history_id");
        await sync_table.cleanupSyncRowsForMissingEntities("recent_notes", "note_tree_id");
    });

    res.send({});
});

router.post('/vacuum-database', async (req, res, next) => {
    await sql.execute("VACUUM");

    res.send({});
});

module.exports = router;