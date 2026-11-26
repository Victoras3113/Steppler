// Tiny German/English translation store. Choice is saved on the device; German is the default.
import { useSyncExternalStore } from "react";

export type Lang = "de" | "en" | "pl" | "ro";

const en = {
  appName: "Seppeler Gabelstapler-Disponent",
  tagline: "Call your drivers in one tap. First to accept takes the order.",
  signIn: "Sign in", driverSignup: "Driver signup", adminSignup: "Admin signup",
  adminNote: "Admin accounts need approval from the owner before they get admin access.",
  yourName: "Your name", email: "Email", password: "Password",
  requestAdmin: "Request admin account", createDriver: "Create driver account",
  forgot: "Forgot password?", enterEmail: "Enter your email first",
  checkReset: "Check your email for a reset link.", checkConfirm: "Check your email to confirm your account.",
  adminApprovalInfo: "Your admin access must be approved by the owner.",
  signOut: "Sign out", loading: "Loading…",
  waiting: "Waiting for approval",
  waitingText: "The owner must approve your admin account before you can dispatch orders.",
  checkAgain: "Check again",
  dispatch: "Dispatch", administrator: "Administrator",
  details: "Details", hide: "Hide", adminAccounts: "Admin accounts", ordersToday: "Orders processed today", history: "History", hideHistory: "Hide history", noHistory: "No orders on earlier days.", ordersCount: "{n} orders", done: "Done", inProgress: "In progress",
  onDutyFor: "On duty for", offDutyFor: "Off duty for", inStatus: "In {s}", wasOffFor: "Off duty before that", wasOnFor: "Last shift lasted", today: "Today",
  sentAt: "Sent {d}", waitingFor: "Waiting", tookFor: "Accepted after",
  newOrder: "New order", detailsPh: "Enter details about the order",
  customers: "Regular customers", companyName: "Company name", add: "Add", remove: "Remove",
  noCustomers: "No regular customers yet.", pickCustomer: "Choose a regular customer…",
  callAll: "Call all drivers", addDetails: "Add order details first",
  calling: "Calling all {n} drivers…", pushSent: "Phone alert sent to {n} available driver(s)",
  pushFail: "Phone alerts could not be sent. Please try again.",
  evAccepted: "{name} started processing the order", evDone: "{name} finished the order", evOverdue: "Order not accepted for 30 minutes!",
  availableNow: "of {n} available now",
  drivers: "Drivers", noDrivers: "No drivers yet. Ask them to create an account in the app.",
  activeOrders: "Active orders", noActive: "No active orders.",
  waitingDriver: "Waiting for a driver…", acceptedBy: "Accepted by {name}", cancelOrder: "Cancel order",
  adminRequests: "Admin requests", approve: "Approve", decline: "Decline",
  approved: "Administrator approved", declined: "Request declined — added as driver",
  driver: "Driver", staplaDriver: "Stapla Driver",
  st_available: "Available", st_busy: "Processing Order", st_break: "Break", st_off: "Off Duty",
  enableAlerts: "Enable sound & notifications",
  alertsOn: "Alerts enabled — you'll be notified even when your phone is locked",
  alertsOpenOnly: "Alerts enabled while the app is open. For locked-phone alerts, open the app from your home screen.",
  newTab: "Open the app in its own tab to allow notifications.",
  iphoneHint: "On iPhone: Share → Add to Home Screen, then open it from there.",
  blocked: "Notifications are blocked in your settings.",
  yours: "Order is yours!", taken: "Another driver already took it.",
  doneMsg: "Marked as done. You're available again.",
  yourOrders: "Your orders", markDone: "Mark as done",
  openCalls: "Open calls", noCalls: "No calls right now. Keep the app open to hear new ones.",
  accept: "Accept", helpNeeded: "Help needed!", acceptOrder: "Accept order", notNow: "Not now",
  newOrderAlert: "New order — help needed!",
  justNow: "just now", minAgo: "{n} min ago", hAgo: "{n} h ago",
  newPassword: "New password", savePassword: "Save password", pwUpdated: "Password updated",
  deleteAccount: "Delete account", confirmDelete: "Permanently delete the account of {name}? This cannot be undone.", accountDeleted: "Account deleted", cancel: "Cancel", photosTitle: "Photos of the order (at least 3)", addPhoto: "+ Add photo", photo: "Photo", uploading: "Uploading…", photoFailed: "Photo upload failed", photosRequired: "Take {n} more photo(s) to finish the order.", noPhotos: "No photos for this order.", photos: "Photos", download: "Download", downloadAll: "Download all (ZIP)", preparing: "Preparing…", deleteOrder: "Delete order", confirmDeleteOrder: "Permanently delete this order and its photos? This cannot be undone.", orderDeleted: "Order deleted", mainAccount: "main account",
  username: "Username", emailOrUser: "Email or username", userRule: "Username: 3–30 letters, numbers, . _ -", userTaken: "Username already taken", setDriverPw: "Set new password", pwSet: "Password changed", forgotDriver: "Drivers: ask your administrator to reset your password.", editProfile: "Edit profile", saveProfile: "Save", profileSaved: "Profile saved", emailChange: "Check both inboxes to confirm the new email.", currentPassword: "Current password", pwRule: "At least 8 characters, 1 uppercase letter, 1 number and 1 special character.",
};

const de: typeof en = {
  appName: "Seppeler Gabelstapler-Disponent",
  tagline: "Rufen Sie Ihre Fahrer mit einem Tipp. Wer zuerst annimmt, übernimmt den Auftrag.",
  signIn: "Anmelden", driverSignup: "Fahrer-Konto", adminSignup: "Admin-Konto",
  adminNote: "Admin-Konten müssen vom Inhaber freigegeben werden, bevor sie Admin-Rechte erhalten.",
  yourName: "Ihr Name", email: "E-Mail", password: "Passwort",
  requestAdmin: "Admin-Konto anfragen", createDriver: "Fahrer-Konto erstellen",
  forgot: "Passwort vergessen?", enterEmail: "Bitte zuerst E-Mail eingeben",
  checkReset: "Prüfen Sie Ihre E-Mails für den Link zum Zurücksetzen.",
  checkConfirm: "Prüfen Sie Ihre E-Mails, um Ihr Konto zu bestätigen.",
  adminApprovalInfo: "Ihr Admin-Zugang muss vom Inhaber freigegeben werden.",
  signOut: "Abmelden", loading: "Lädt…",
  waiting: "Warten auf Freigabe",
  waitingText: "Der Inhaber muss Ihr Admin-Konto freigeben, bevor Sie Aufträge vergeben können.",
  checkAgain: "Erneut prüfen",
  dispatch: "Disposition", administrator: "Administrator",
  details: "Details", hide: "Ausblenden", adminAccounts: "Admin-Konten", ordersToday: "Heute bearbeitete Aufträge", history: "Verlauf", hideHistory: "Verlauf ausblenden", noHistory: "Keine Aufträge an früheren Tagen.", ordersCount: "{n} Aufträge", done: "Erledigt", inProgress: "In Bearbeitung",
  onDutyFor: "Im Dienst seit", offDutyFor: "Offline seit", inStatus: "In {s}", wasOffFor: "Davor offline", wasOnFor: "Letzte Schicht dauerte", today: "Heute",
  sentAt: "Gesendet {d}", waitingFor: "Wartet seit", tookFor: "Angenommen nach",
  newOrder: "Neuer Auftrag", detailsPh: "Details zum Auftrag eingeben",
  customers: "Stammkunden", companyName: "Firmenname", add: "Hinzufügen", remove: "Entfernen",
  noCustomers: "Noch keine Stammkunden.", pickCustomer: "Stammkunden wählen…",
  callAll: "Alle Fahrer rufen", addDetails: "Bitte zuerst Auftragsdetails eingeben",
  calling: "Alle {n} Fahrer werden gerufen…", pushSent: "Handy-Alarm an {n} verfügbare(n) Fahrer gesendet",
  pushFail: "Handy-Alarme konnten nicht gesendet werden. Bitte erneut versuchen.",
  evAccepted: "{name} bearbeitet jetzt den Auftrag", evDone: "{name} hat den Auftrag erledigt", evOverdue: "Auftrag seit 30 Minuten nicht angenommen!",
  availableNow: "von {n} jetzt verfügbar",
  drivers: "Fahrer", noDrivers: "Noch keine Fahrer. Bitten Sie sie, ein Konto in der App zu erstellen.",
  activeOrders: "Aktive Aufträge", noActive: "Keine aktiven Aufträge.",
  waitingDriver: "Warte auf einen Fahrer…", acceptedBy: "Angenommen von {name}", cancelOrder: "Auftrag stornieren",
  adminRequests: "Admin-Anfragen", approve: "Freigeben", decline: "Ablehnen",
  approved: "Administrator freigegeben", declined: "Anfrage abgelehnt – als Fahrer hinzugefügt",
  driver: "Fahrer", staplaDriver: "Stapler-Fahrer",
  st_available: "Verfügbar", st_busy: "Auftrag läuft", st_break: "Pause", st_off: "Feierabend",
  enableAlerts: "Ton & Benachrichtigungen aktivieren",
  alertsOn: "Alarme aktiviert – auch bei gesperrtem Handy",
  alertsOpenOnly: "Alarme nur bei geöffneter App aktiv. Für Alarme bei gesperrtem Handy die App vom Home-Bildschirm öffnen.",
  newTab: "Öffnen Sie die App in einem eigenen Tab, um Benachrichtigungen zu erlauben.",
  iphoneHint: "Auf dem iPhone: Teilen → Zum Home-Bildschirm, dann von dort öffnen.",
  blocked: "Benachrichtigungen sind in Ihren Einstellungen blockiert.",
  yours: "Der Auftrag gehört Ihnen!", taken: "Ein anderer Fahrer hat ihn bereits übernommen.",
  doneMsg: "Als erledigt markiert. Sie sind wieder verfügbar.",
  yourOrders: "Ihre Aufträge", markDone: "Als erledigt markieren",
  openCalls: "Offene Rufe", noCalls: "Gerade keine Rufe. Lassen Sie die App offen, um neue zu hören.",
  accept: "Annehmen", helpNeeded: "Hilfe benötigt!", acceptOrder: "Auftrag annehmen", notNow: "Nicht jetzt",
  newOrderAlert: "Neuer Auftrag – Hilfe benötigt!",
  justNow: "gerade eben", minAgo: "vor {n} Min.", hAgo: "vor {n} Std.",
  newPassword: "Neues Passwort", savePassword: "Passwort speichern", pwUpdated: "Passwort aktualisiert",
  deleteAccount: "Konto löschen", confirmDelete: "Konto von {name} endgültig löschen? Das kann nicht rückgängig gemacht werden.", accountDeleted: "Konto gelöscht", cancel: "Abbrechen", photosTitle: "Fotos vom Auftrag (mindestens 3)", addPhoto: "+ Foto hinzufügen", photo: "Foto", uploading: "Wird hochgeladen…", photoFailed: "Foto-Upload fehlgeschlagen", photosRequired: "Noch {n} Foto(s) aufnehmen, um den Auftrag abzuschließen.", noPhotos: "Keine Fotos zu diesem Auftrag.", photos: "Fotos", download: "Herunterladen", downloadAll: "Alle herunterladen (ZIP)", preparing: "Wird vorbereitet…", deleteOrder: "Auftrag löschen", confirmDeleteOrder: "Diesen Auftrag samt Fotos endgültig löschen? Das kann nicht rückgängig gemacht werden.", orderDeleted: "Auftrag gelöscht", mainAccount: "Hauptkonto",
  username: "Benutzername", emailOrUser: "E-Mail oder Benutzername", userRule: "Benutzername: 3–30 Buchstaben, Zahlen, . _ -", userTaken: "Benutzername bereits vergeben", setDriverPw: "Neues Passwort setzen", pwSet: "Passwort geändert", forgotDriver: "Fahrer: Bitte den Administrator bitten, das Passwort zurückzusetzen.", editProfile: "Profil bearbeiten", saveProfile: "Speichern", profileSaved: "Profil gespeichert", emailChange: "Bitte die neue E-Mail über den Link in Ihrem Postfach bestätigen.", currentPassword: "Aktuelles Passwort", pwRule: "Mindestens 8 Zeichen, 1 Großbuchstabe, 1 Zahl und 1 Sonderzeichen.",
};


const pl: typeof en = {
  appName: "Seppeler Gabelstapler-Disponent",
  tagline: "Wezwij kierowców jednym dotknięciem. Kto pierwszy przyjmie, ten przejmuje zlecenie.",
  signIn: "Zaloguj", driverSignup: "Konto kierowcy", adminSignup: "Konto admina",
  adminNote: "Konta administratora wymagają zatwierdzenia, zanim otrzymają uprawnienia.",
  yourName: "Twoje imię", email: "E-mail", password: "Hasło",
  requestAdmin: "Poproś o konto admina", createDriver: "Utwórz konto kierowcy",
  forgot: "Nie pamiętasz hasła?", enterEmail: "Najpierw wpisz e-mail",
  checkReset: "Sprawdź e-mail – wysłaliśmy link do resetu.", checkConfirm: "Sprawdź e-mail, aby potwierdzić konto.",
  adminApprovalInfo: "Twój dostęp administratora musi zostać zatwierdzony.",
  signOut: "Wyloguj", loading: "Ładowanie…",
  waiting: "Oczekiwanie na zatwierdzenie",
  waitingText: "Administrator musi zatwierdzić Twoje konto, zanim będziesz mógł wysyłać zlecenia.",
  checkAgain: "Sprawdź ponownie",
  dispatch: "Dyspozycja", administrator: "Administrator",
  details: "Szczegóły", hide: "Ukryj", adminAccounts: "Konta administratorów", ordersToday: "Zlecenia wykonane dziś", history: "Historia", hideHistory: "Ukryj historię", noHistory: "Brak zleceń z poprzednich dni.", ordersCount: "{n} zleceń", done: "Zakończone", inProgress: "W trakcie",
  onDutyFor: "W pracy od", offDutyFor: "Offline od", inStatus: "W {s}", wasOffFor: "Wcześniej offline", wasOnFor: "Ostatnia zmiana trwała", today: "Dziś",
  sentAt: "Wysłano {d}", waitingFor: "Czeka", tookFor: "Przyjęto po",
  newOrder: "Nowe zlecenie", detailsPh: "Wpisz szczegóły zlecenia",
  customers: "Stali klienci", companyName: "Nazwa firmy", add: "Dodaj", remove: "Usuń",
  noCustomers: "Brak stałych klientów.", pickCustomer: "Wybierz stałego klienta…",
  callAll: "Wezwij wszystkich kierowców", addDetails: "Najpierw dodaj szczegóły zlecenia",
  calling: "Wzywanie {n} kierowców…", pushSent: "Alarm wysłany do {n} dostępnych kierowców",
  pushFail: "Nie udało się wysłać alarmów. Spróbuj ponownie.",
  evAccepted: "{name} rozpoczął realizację zlecenia", evDone: "{name} zakończył zlecenie", evOverdue: "Zlecenie nieprzyjęte od 30 minut!",
  availableNow: "z {n} dostępnych teraz",
  drivers: "Kierowcy", noDrivers: "Brak kierowców. Poproś ich o założenie konta w aplikacji.",
  activeOrders: "Aktywne zlecenia", noActive: "Brak aktywnych zleceń.",
  waitingDriver: "Czekam na kierowcę…", acceptedBy: "Przyjęte przez {name}", cancelOrder: "Anuluj zlecenie",
  adminRequests: "Prośby o konto admina", approve: "Zatwierdź", decline: "Odrzuć",
  approved: "Administrator zatwierdzony", declined: "Prośba odrzucona – dodano jako kierowcę",
  driver: "Kierowca", staplaDriver: "Kierowca wózka",
  st_available: "Dostępny", st_busy: "Realizuje zlecenie", st_break: "Przerwa", st_off: "Koniec pracy",
  enableAlerts: "Włącz dźwięk i powiadomienia",
  alertsOn: "Alarmy włączone – także przy zablokowanym telefonie",
  alertsOpenOnly: "Alarmy działają tylko przy otwartej aplikacji. Otwórz ją z ekranu głównego, aby działały przy zablokowanym telefonie.",
  newTab: "Otwórz aplikację w osobnej karcie, aby zezwolić na powiadomienia.",
  iphoneHint: "Na iPhonie: Udostępnij → Do ekranu początkowego, potem otwórz stamtąd.",
  blocked: "Powiadomienia są zablokowane w ustawieniach.",
  yours: "Zlecenie jest Twoje!", taken: "Inny kierowca już je przyjął.",
  doneMsg: "Oznaczono jako zakończone. Jesteś znów dostępny.",
  yourOrders: "Twoje zlecenia", markDone: "Oznacz jako zakończone",
  openCalls: "Otwarte wezwania", noCalls: "Brak wezwań. Zostaw aplikację otwartą, aby usłyszeć nowe.",
  accept: "Przyjmij", helpNeeded: "Potrzebna pomoc!", acceptOrder: "Przyjmij zlecenie", notNow: "Nie teraz",
  newOrderAlert: "Nowe zlecenie – potrzebna pomoc!",
  justNow: "przed chwilą", minAgo: "{n} min temu", hAgo: "{n} godz. temu",
  newPassword: "Nowe hasło", savePassword: "Zapisz hasło", pwUpdated: "Hasło zaktualizowane",
  deleteAccount: "Usuń konto", confirmDelete: "Trwale usunąć konto {name}? Tej operacji nie można cofnąć.", accountDeleted: "Konto usunięte", cancel: "Anuluj", photosTitle: "Zdjęcia zlecenia (minimum 3)", addPhoto: "+ Dodaj zdjęcie", photo: "Zdjęcie", uploading: "Przesyłanie…", photoFailed: "Nie udało się przesłać zdjęcia", photosRequired: "Zrób jeszcze {n} zdjęć(-cia), aby zakończyć zlecenie.", noPhotos: "Brak zdjęć dla tego zlecenia.", photos: "Zdjęcia", download: "Pobierz", downloadAll: "Pobierz wszystkie (ZIP)", preparing: "Przygotowywanie…", deleteOrder: "Usuń zlecenie", confirmDeleteOrder: "Trwale usunąć to zlecenie wraz ze zdjęciami? Tej operacji nie można cofnąć.", orderDeleted: "Zlecenie usunięte", mainAccount: "konto główne",
  username: "Nazwa użytkownika", emailOrUser: "E-mail lub nazwa użytkownika", userRule: "Nazwa: 3–30 liter, cyfr, . _ -", userTaken: "Nazwa użytkownika zajęta", setDriverPw: "Ustaw nowe hasło", pwSet: "Hasło zmienione", forgotDriver: "Kierowcy: poproś administratora o reset hasła.", editProfile: "Edytuj profil", saveProfile: "Zapisz", profileSaved: "Profil zapisany", emailChange: "Potwierdź nowy e-mail linkiem ze skrzynki.", currentPassword: "Obecne hasło", pwRule: "Min. 8 znaków, 1 wielka litera, 1 cyfra i 1 znak specjalny.",
};

const ro: typeof en = {
  appName: "Seppeler Gabelstapler-Disponent",
  tagline: "Cheamă șoferii cu o singură atingere. Primul care acceptă preia comanda.",
  signIn: "Autentificare", driverSignup: "Cont șofer", adminSignup: "Cont admin",
  adminNote: "Conturile de administrator trebuie aprobate înainte de a primi drepturi de admin.",
  yourName: "Numele tău", email: "E-mail", password: "Parolă",
  requestAdmin: "Solicită cont admin", createDriver: "Creează cont de șofer",
  forgot: "Ai uitat parola?", enterEmail: "Introdu mai întâi e-mailul",
  checkReset: "Verifică e-mailul pentru linkul de resetare.", checkConfirm: "Verifică e-mailul pentru a confirma contul.",
  adminApprovalInfo: "Accesul de administrator trebuie aprobat.",
  signOut: "Deconectare", loading: "Se încarcă…",
  waiting: "Se așteaptă aprobarea",
  waitingText: "Un administrator trebuie să-ți aprobe contul înainte să poți trimite comenzi.",
  checkAgain: "Verifică din nou",
  dispatch: "Dispecerat", administrator: "Administrator",
  details: "Detalii", hide: "Ascunde", adminAccounts: "Conturi de administrator", ordersToday: "Comenzi procesate azi", history: "Istoric", hideHistory: "Ascunde istoricul", noHistory: "Nicio comandă în zilele anterioare.", ordersCount: "{n} comenzi", done: "Finalizată", inProgress: "În lucru",
  onDutyFor: "La muncă de", offDutyFor: "Offline de", inStatus: "În {s}", wasOffFor: "Înainte offline", wasOnFor: "Ultima tură a durat", today: "Azi",
  sentAt: "Trimisă {d}", waitingFor: "Așteaptă de", tookFor: "Acceptată după",
  newOrder: "Comandă nouă", detailsPh: "Introdu detaliile comenzii",
  customers: "Clienți obișnuiți", companyName: "Numele firmei", add: "Adaugă", remove: "Șterge",
  noCustomers: "Încă nu există clienți obișnuiți.", pickCustomer: "Alege un client obișnuit…",
  callAll: "Cheamă toți șoferii", addDetails: "Adaugă mai întâi detaliile comenzii",
  calling: "Se cheamă toți cei {n} șoferi…", pushSent: "Alertă trimisă la {n} șofer(i) disponibil(i)",
  pushFail: "Alertele nu au putut fi trimise. Încearcă din nou.",
  evAccepted: "{name} a început procesarea comenzii", evDone: "{name} a finalizat comanda", evOverdue: "Comandă neacceptată de 30 de minute!",
  availableNow: "din {n} disponibili acum",
  drivers: "Șoferi", noDrivers: "Încă nu există șoferi. Roagă-i să-și creeze cont în aplicație.",
  activeOrders: "Comenzi active", noActive: "Nicio comandă activă.",
  waitingDriver: "Se așteaptă un șofer…", acceptedBy: "Acceptată de {name}", cancelOrder: "Anulează comanda",
  adminRequests: "Cereri de admin", approve: "Aprobă", decline: "Respinge",
  approved: "Administrator aprobat", declined: "Cerere respinsă – adăugat ca șofer",
  driver: "Șofer", staplaDriver: "Șofer stivuitor",
  st_available: "Disponibil", st_busy: "Procesează comanda", st_break: "Pauză", st_off: "Liber",
  enableAlerts: "Activează sunetul și notificările",
  alertsOn: "Alerte activate – chiar și cu telefonul blocat",
  alertsOpenOnly: "Alertele funcționează doar cu aplicația deschisă. Deschide-o de pe ecranul principal pentru alerte cu telefonul blocat.",
  newTab: "Deschide aplicația într-o filă separată pentru a permite notificările.",
  iphoneHint: "Pe iPhone: Partajează → Adaugă pe ecranul principal, apoi deschide de acolo.",
  blocked: "Notificările sunt blocate în setări.",
  yours: "Comanda este a ta!", taken: "Alt șofer a preluat-o deja.",
  doneMsg: "Marcată ca finalizată. Ești din nou disponibil.",
  yourOrders: "Comenzile tale", markDone: "Marchează ca finalizată",
  openCalls: "Apeluri deschise", noCalls: "Niciun apel acum. Ține aplicația deschisă pentru a auzi apelurile noi.",
  accept: "Acceptă", helpNeeded: "E nevoie de ajutor!", acceptOrder: "Acceptă comanda", notNow: "Nu acum",
  newOrderAlert: "Comandă nouă – e nevoie de ajutor!",
  justNow: "chiar acum", minAgo: "acum {n} min", hAgo: "acum {n} ore",
  newPassword: "Parolă nouă", savePassword: "Salvează parola", pwUpdated: "Parolă actualizată",
  deleteAccount: "Șterge contul", confirmDelete: "Ștergi definitiv contul lui {name}? Acțiunea nu poate fi anulată.", accountDeleted: "Cont șters", cancel: "Anulează", photosTitle: "Fotografii ale comenzii (minimum 3)", addPhoto: "+ Adaugă fotografie", photo: "Foto", uploading: "Se încarcă…", photoFailed: "Încărcarea fotografiei a eșuat", photosRequired: "Mai fă {n} fotografie(i) pentru a finaliza comanda.", noPhotos: "Nicio fotografie pentru această comandă.", photos: "Fotografii", download: "Descarcă", downloadAll: "Descarcă tot (ZIP)", preparing: "Se pregătește…", deleteOrder: "Șterge comanda", confirmDeleteOrder: "Ștergi definitiv această comandă și fotografiile ei? Acțiunea nu poate fi anulată.", orderDeleted: "Comandă ștearsă", mainAccount: "cont principal",
  username: "Nume utilizator", emailOrUser: "E-mail sau nume utilizator", userRule: "Nume utilizator: 3–30 litere, cifre, . _ -", userTaken: "Nume utilizator deja folosit", setDriverPw: "Setează parolă nouă", pwSet: "Parolă schimbată", forgotDriver: "Șoferi: cereți administratorului resetarea parolei.", editProfile: "Editează profilul", saveProfile: "Salvează", profileSaved: "Profil salvat", emailChange: "Confirmă noul e-mail prin linkul din căsuța poștală.", currentPassword: "Parola actuală", pwRule: "Minim 8 caractere, 1 literă mare, 1 cifră și 1 caracter special.",
};

export type Key = keyof typeof en;
const dict = { en, de, pl, ro };
const KEY = "lang";
let lang: Lang = "de";
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  const s = localStorage.getItem(KEY);
  if (s === "en" || s === "de" || s === "pl" || s === "ro") lang = s;
}

export function setLang(l: Lang) {
  lang = l;
  localStorage.setItem(KEY, l);
  document.documentElement.lang = l;
  listeners.forEach((f) => f());
}

export function t(k: Key, vars?: Record<string, string | number>) {
  let s: string = dict[lang][k];
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.replace(`{${a}}`, String(b));
  return s;
}

export function useLang() {
  return useSyncExternalStore(
    (f) => { listeners.add(f); return () => listeners.delete(f); },
    () => lang,
    () => "de" as Lang,
  );
}

export function LangSwitch() {
  const l = useLang();
  return (
    <div className="flex rounded-lg border text-xs font-semibold">
      {(["de", "en", "pl", "ro"] as Lang[]).map((x) => (
        <button key={x} type="button" onClick={() => setLang(x)}
          className={`px-2 py-1 uppercase ${l === x ? "rounded-lg bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
          {x}
        </button>
      ))}
    </div>
  );
}
export const pwOk = (p: string) => p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);

export const getLang = () => lang;
