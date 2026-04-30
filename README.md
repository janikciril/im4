# im4# 🔑👤 Authentifizierung Minimal (Boilerplate)

![Static Badge](https://img.shields.io/badge/Sprache-PHP-%23f7df1e)
![Static Badge](https://img.shields.io/badge/Kurs-MMP_IM4-blue)
![Last Changed](https://img.shields.io/endpoint?url=https://badges.crazy-internet.ch/im4_example.php)

> 🎨 Dieses Boilerplate kann entweder in einem Code-Along Schritt für Schritt gemeinsam erarbeitet werden oder fixfertig auf einem Webserver installiert werden.

Dieses Repository beinhaltet ein vollständiges, minimales Authenzifizierungs-System basierend auf PHP als Backend und HTML/CSS/JS als Frontend.

Es ermöglicht Benutzern das `Registrieren`, `Anmelden`, `Abmelden` und den Zugriff auf eine `geschützte Seite` nach erfolgreicher Authentifizierung.

Eine einfache Erklärung des Login-Ablaufs mit Sessions und Cookies findest du in [`sessions.md`](sessions.md).

# 🏁 Live - Version

Du kannst Homely unter folgendem Link testen:

[https://im4.crazy-internet.ch/](https://im4.crazy-internet.ch/)

## ⚙️ Installation

Um dieses Boilerplate auf dem eigenen Web-Server zu installieren, führe folgende Schritte aus:

### 1. Download

- [Klone das Repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) über GitHub oder [downloade das Repository als ZIP Datei](https://docs.github.com/en/repositories/working-with-files/using-files/downloading-source-code-archives) auf deinen eigenen Computer.

### 2. Datenbank

- Erstelle eine neue Datenbank bei deinem Hoster (z.B. [Infomaniak](https://www.infomaniak.com/de/support/faq/1981/mysqlmariadb-benutzer-und-datenbanken-verwalten)).

- Importiere die Datei `system/database.sql` in die neue Datenbank, um die `users` Tabelle zu erstellen.

### 3. Code

- Benenne die Datei `system/config.php.blank` in `system/config.php` um.

- Passe die Datenbankverbindungsdaten in der Datei `system/config.php` an.

### 4. FTP Connect

- Erstelle eine neue FTP Verbindung mit dem SFTP Plugin gemäss [Anleitung im MMP 101](https://github.com/Interaktive-Medien/101-MMP/blob/main/resources/sftp.md).

# 📁 Struktur

## 🎨 Frontend

### root (Basis-Verzeichnis)

- beinhaltet alle HTML-Dateien des Frontends.
- beinhaltet die `.gitignore` Datei, welche die Dateien und Verzeichnisse ausblendet, die nicht auf GitHub hochgeladen werden sollen.

### js

- beinhaltet alle JavaScript-Dateien des Frontends.

### css

- beinhaltet alle CSS-Dateien des Frontends.

## 🤖 Backend

### api

- Beinhaltet alle API-Endpunkte des Backends.
- Diese Dateien werden von `JavaScript` aufgerufen und geben eine Antwort an `JavaScript` zurück.

### system

- Beinhaltet die Konfigurationsdatei für die Datenbankverbindung.
- Beinhaltet die Datei `database.sql`, die die `users` Tabelle erstellt.
- Beinhaltet die Datei `config.php`, die die Konfiguration des Backends enthält.
