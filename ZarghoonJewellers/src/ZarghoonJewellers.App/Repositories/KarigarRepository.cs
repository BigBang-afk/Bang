using System;
using System.Collections.Generic;
using Microsoft.Data.Sqlite;
using ZarghoonJewellers.App.Data;
using ZarghoonJewellers.App.Models;

namespace ZarghoonJewellers.App.Repositories
{
    public class KarigarRepository
    {
        public List<Karigar> GetAll(string search = null)
        {
            var result = new List<Karigar>();

            using var connection = SqliteConnectionFactory.Create();
            using var cmd = connection.CreateCommand();

            cmd.CommandText = "SELECT Id, Name, Mobile, Address, Notes, CreatedAt FROM Karigars";
            if (!string.IsNullOrWhiteSpace(search))
            {
                cmd.CommandText += " WHERE Name LIKE $search OR Mobile LIKE $search";
                cmd.Parameters.AddWithValue("$search", "%" + search.Trim() + "%");
            }
            cmd.CommandText += " ORDER BY Name COLLATE NOCASE ASC";

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                result.Add(ReadKarigar(reader));
            }

            return result;
        }

        public Karigar GetById(int id)
        {
            using var connection = SqliteConnectionFactory.Create();
            using var cmd = connection.CreateCommand();
            cmd.CommandText = "SELECT Id, Name, Mobile, Address, Notes, CreatedAt FROM Karigars WHERE Id = $id";
            cmd.Parameters.AddWithValue("$id", id);

            using var reader = cmd.ExecuteReader();
            return reader.Read() ? ReadKarigar(reader) : null;
        }

        public int Add(Karigar karigar)
        {
            using var connection = SqliteConnectionFactory.Create();
            using var cmd = connection.CreateCommand();
            cmd.CommandText = @"
INSERT INTO Karigars (Name, Mobile, Address, Notes, CreatedAt)
VALUES ($name, $mobile, $address, $notes, $createdAt);
SELECT last_insert_rowid();";

            cmd.Parameters.AddWithValue("$name", karigar.Name ?? string.Empty);
            cmd.Parameters.AddWithValue("$mobile", karigar.Mobile ?? string.Empty);
            cmd.Parameters.AddWithValue("$address", karigar.Address ?? string.Empty);
            cmd.Parameters.AddWithValue("$notes", karigar.Notes ?? string.Empty);
            cmd.Parameters.AddWithValue("$createdAt", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"));

            return Convert.ToInt32((long)cmd.ExecuteScalar());
        }

        public void Update(Karigar karigar)
        {
            using var connection = SqliteConnectionFactory.Create();
            using var cmd = connection.CreateCommand();
            cmd.CommandText = @"
UPDATE Karigars SET Name = $name, Mobile = $mobile, Address = $address, Notes = $notes
WHERE Id = $id";

            cmd.Parameters.AddWithValue("$name", karigar.Name ?? string.Empty);
            cmd.Parameters.AddWithValue("$mobile", karigar.Mobile ?? string.Empty);
            cmd.Parameters.AddWithValue("$address", karigar.Address ?? string.Empty);
            cmd.Parameters.AddWithValue("$notes", karigar.Notes ?? string.Empty);
            cmd.Parameters.AddWithValue("$id", karigar.Id);

            cmd.ExecuteNonQuery();

            // Keep denormalized PersonName in sync on existing transactions.
            using var syncCash = connection.CreateCommand();
            syncCash.CommandText = "UPDATE CashTransactions SET PersonName = $name WHERE KarigarId = $id";
            syncCash.Parameters.AddWithValue("$name", karigar.Name ?? string.Empty);
            syncCash.Parameters.AddWithValue("$id", karigar.Id);
            syncCash.ExecuteNonQuery();

            using var syncGold = connection.CreateCommand();
            syncGold.CommandText = "UPDATE GoldTransactions SET PersonName = $name WHERE KarigarId = $id";
            syncGold.Parameters.AddWithValue("$name", karigar.Name ?? string.Empty);
            syncGold.Parameters.AddWithValue("$id", karigar.Id);
            syncGold.ExecuteNonQuery();
        }

        /// <summary>Returns true if the Karigar has any recorded cash or gold transactions.</summary>
        public bool HasTransactions(int karigarId)
        {
            using var connection = SqliteConnectionFactory.Create();

            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = "SELECT COUNT(*) FROM CashTransactions WHERE KarigarId = $id";
                cmd.Parameters.AddWithValue("$id", karigarId);
                if (Convert.ToInt32((long)cmd.ExecuteScalar()) > 0) return true;
            }

            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = "SELECT COUNT(*) FROM GoldTransactions WHERE KarigarId = $id";
                cmd.Parameters.AddWithValue("$id", karigarId);
                if (Convert.ToInt32((long)cmd.ExecuteScalar()) > 0) return true;
            }

            return false;
        }

        /// <summary>Deletes a Karigar. Returns false (and deletes nothing) if the Karigar already has
        /// transactions recorded against it, to avoid orphaning ledger data.</summary>
        public bool Delete(int karigarId)
        {
            if (HasTransactions(karigarId))
                return false;

            using var connection = SqliteConnectionFactory.Create();
            using var cmd = connection.CreateCommand();
            cmd.CommandText = "DELETE FROM Karigars WHERE Id = $id";
            cmd.Parameters.AddWithValue("$id", karigarId);
            cmd.ExecuteNonQuery();
            return true;
        }

        private static Karigar ReadKarigar(SqliteDataReader reader)
        {
            return new Karigar
            {
                Id = reader.GetInt32(0),
                Name = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                Mobile = reader.IsDBNull(2) ? string.Empty : reader.GetString(2),
                Address = reader.IsDBNull(3) ? string.Empty : reader.GetString(3),
                Notes = reader.IsDBNull(4) ? string.Empty : reader.GetString(4),
                CreatedAt = DateTime.TryParse(reader.IsDBNull(5) ? null : reader.GetString(5), out var dt) ? dt : DateTime.Now,
            };
        }
    }
}
