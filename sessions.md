# Sessions, Cookies und Login

Diese Datei erklärt, wie die Authentifizierung in diesem Projekt funktioniert.

Das Wichtigste zuerst:

- Das Passwort wird nie im Browser gespeichert.
- Der Browser bekommt nach dem Login nur ein Session-Cookie.
- Die eigentlichen Login-Daten liegen auf dem Server.
- HTML und JavaScript sind nicht geheim. Alles, was in `.html` oder `.js` steht, kann im Browser gelesen werden.

## Was ist eine Session?

Eine Session ist ein Speicherplatz auf dem Server für einen bestimmten Benutzer.

Nach einem erfolgreichen Login speichert PHP zum Beispiel:

```php
$_SESSION['user_id'] = $user['id'];
$_SESSION['email'] = $email;
```

Diese Daten liegen auf dem Server, nicht direkt im Browser.

## Was ist ein Cookie?

Ein Cookie ist eine kleine Information, die der Browser speichert und bei späteren Requests wieder an den Server schickt.

Bei PHP-Sessions enthält das Cookie normalerweise nur eine Session-ID, zum Beispiel ungefähr so:

```text
PHPSESSID=abc123...
```

Diese ID ist wie eine Garderobenmarke:

- Der Browser hat nur die Marke.
- Der Server findet mit dieser Marke die passende Session.
- Die Session enthält dann zum Beispiel `user_id` und `email`.

## 1. Registrierung

Dateien:

- `register.html`
- `js/register.js`
- `api/register.php`

Beim Registrieren gibt der Benutzer E-Mail und Passwort ein.

`js/register.js` schickt diese Daten als JSON an das Backend:

```js
body: JSON.stringify({ email, password });
```

`api/register.php` liest diese JSON-Daten:

```php
$data = json_decode(file_get_contents("php://input"), true);
```

Danach wird das Passwort nicht direkt gespeichert. Stattdessen wird ein Hash erstellt:

```php
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);
```

In der Datenbank wird also nicht das echte Passwort gespeichert, sondern nur der Passwort-Hash.

## 2. Login

Dateien:

- `login.html`
- `js/login.js`
- `api/login.php`

Beim Login schickt `js/login.js` wieder E-Mail und Passwort als JSON an `api/login.php`.

Das Backend sucht den Benutzer in der Datenbank:

```php
$stmt = $pdo->prepare("SELECT id, password FROM users WHERE email = :email");
```

Danach prüft PHP, ob das eingegebene Passwort zum gespeicherten Hash passt:

```php
password_verify($password, $user['password'])
```

Wenn das Passwort stimmt, wird eine Session erstellt:

```php
session_regenerate_id(true);
$_SESSION['user_id'] = $user['id'];
$_SESSION['email'] = $email;
```

`session_regenerate_id(true)` erstellt eine neue Session-ID. Das ist sicherer, weil die alte Session-ID nach dem Login nicht weiterverwendet wird.

## 3. Das Session-Cookie

Wenn `session_start()` aufgerufen wird, kümmert sich PHP um das Session-Cookie.

Der Browser speichert dieses Cookie automatisch. Bei weiteren Requests an dieselbe Website sendet der Browser das Cookie wieder mit.

Darum weiss PHP beim nächsten Request:

```text
Dieser Browser gehört zu dieser Session.
```

In `api/login.php` steht zusätzlich:

```php
ini_set('session.cookie_httponly', 1);
```

`HttpOnly` bedeutet: JavaScript kann dieses Cookie nicht direkt auslesen. Das ist gut, weil Session-Cookies besonders wichtig sind.

## 4. Geschützte Seite

Dateien:

- `protected.html`
- `js/protected.js`
- `api/protected.php`

`protected.html` ist eine normale HTML-Datei. Sie ist nicht wirklich geheim, weil jeder Browser HTML und JavaScript lesen kann.

Die echte Prüfung passiert in `api/protected.php`:

```php
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}
```

Wenn keine Session vorhanden ist, antwortet das Backend mit `401 Unauthorized`.

`js/protected.js` merkt das und schickt den Benutzer zur Login-Seite:

```js
if (response.status === 401) {
  window.location.href = "/login.html";
}
```

Wenn die Session gültig ist, gibt `api/protected.php` die Benutzerdaten zurück:

```php
echo json_encode([
    "status" => "success",
    "user_id" => $_SESSION['user_id'],
    "email" => $_SESSION['email']
]);
```

Dann zeigt `js/protected.js` diese Daten auf der Seite an.

## 5. Logout

Dateien:

- `js/logout.js`
- `api/logout.php`

Beim Logout wird die Session geleert und zerstört:

```php
$_SESSION = [];
session_destroy();
```

Danach ist der Benutzer nicht mehr eingeloggt.

Wenn er danach wieder `protected.html` öffnet, kann `api/protected.php` keine gültige Session mehr finden und antwortet wieder mit `401 Unauthorized`.

## Was ist wirklich geschützt?

Nicht geschützt:

- Text in HTML-Dateien
- JavaScript-Code
- CSS
- Bilder, die öffentlich im Projekt liegen

Geschützt:

- Daten, die nur das Backend nach einer Session-Prüfung zurückgibt
- Datenbank-Inhalte
- PHP-Code auf dem Server

Darum sollte wirklich geheimer Inhalt nicht einfach in `protected.html` oder `js/protected.js` stehen. Er sollte vom Backend nur dann gesendet werden, wenn der Benutzer eingeloggt ist.

## Der ganze Ablauf kurz zusammengefasst

1. Benutzer registriert sich.
2. Das Passwort wird als Hash in der Datenbank gespeichert.
3. Benutzer loggt sich ein.
4. PHP prüft E-Mail und Passwort.
5. PHP speichert `user_id` und `email` in der Session.
6. Der Browser bekommt ein Session-Cookie.
7. Bei der geschützten Seite fragt JavaScript `api/protected.php`.
8. PHP prüft, ob eine gültige Session existiert.
9. Wenn ja: Benutzerdaten werden zurückgegeben.
10. Wenn nein: Das Backend antwortet mit `401`, und JavaScript leitet zum Login weiter.
11. Beim Logout wird die Session zerstört.
