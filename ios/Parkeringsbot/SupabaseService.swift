import Foundation
import Security

// MARK: - Oppsett
// Samme Supabase-prosjekt som nettsiden. Publishable-nøkkelen er laget for å
// ligge i apper; dataene beskyttes av RLS-reglene i databasen.
enum SupabaseConfig {
    static let url = URL(string: "https://jkvlbkjodxthdcwthszp.supabase.co")!
    static let key = "sb_publishable_nqBF2pnFImo84VHeX4aEZA_sCYqDwmN"
    static let siteURL = "https://parkeringsbot.app"
}

// MARK: - Datamodeller (samsvarer med supabase/migrations/002 og 003)
struct AuthSession: Codable, Equatable {
    var accessToken: String
    var refreshToken: String
    var expiresAt: Date
    var userId: String
    var email: String
}

struct DBProfile: Codable, Equatable {
    let id: String
    var fullName: String
    var phone: String?
    var role: String
    var notifyEmail: Bool
}

struct DBVehicle: Codable, Identifiable, Equatable {
    let id: String
    let plate: String
}

struct DBFine: Codable, Identifiable, Equatable {
    let id: String
    let plate: String
    let location: String?
    let area: String?
    let amount: Int
    let issueDate: String?
    let deadline: String?
    let status: String
    let reference: String?
}

// MARK: - Feil
struct SupabaseError: LocalizedError {
    let message: String
    var errorDescription: String? { message }

    /// Gjør Supabase-feil om til norsk tekst brukeren forstår.
    static func friendly(_ raw: String?, status: Int = 0) -> SupabaseError {
        let m = (raw ?? "").lowercased()
        let text: String
        if m.contains("invalid login credentials") || m.contains("invalid_credentials") { text = "Feil e-post eller passord." }
        else if m.contains("email not confirmed") { text = "Du må bekrefte e-postadressen din først. Sjekk innboksen." }
        else if m.contains("already registered") || m.contains("user_already_exists") { text = "Det finnes allerede en konto med denne e-posten." }
        else if m.contains("password should be at least") || m.contains("weak_password") { text = "Passordet må ha minst 8 tegn." }
        else if m.contains("rate limit") || m.contains("too many") || status == 429 { text = "For mange forsøk. Vent litt og prøv igjen." }
        else if m.contains("duplicate key") && m.contains("vehicle") { text = "Dette kjøretøyet er allerede lagt til." }
        else if m.contains("plate_format") { text = "Ugyldig registreringsnummer." }
        else if m.contains("jwt") || status == 401 { text = "Innloggingen er utløpt. Logg inn på nytt." }
        else { text = "Noe gikk galt. Prøv igjen." }
        return SupabaseError(message: text)
    }

    static let network = SupabaseError(message: "Ingen kontakt med serveren. Sjekk internettforbindelsen.")
    static let notLoggedIn = SupabaseError(message: "Du er ikke logget inn.")
}

// MARK: - Klient
/// Snakker med Supabase Auth og databasen (PostgREST) over vanlig HTTPS.
final class SupabaseService {
    static let shared = SupabaseService()

    private(set) var session: AuthSession?
    private let urlSession: URLSession = .shared
    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()

    private init() {
        session = Keychain.loadSession()
    }

    // MARK: Auth

    func signIn(email: String, password: String) async throws -> AuthSession {
        let data = try await auth("token?grant_type=password", body: ["email": email, "password": password])
        return try storeSession(from: data)
    }

    /// Returnerer `nil` når e-postbekreftelse er påkrevd (brukeren må trykke på lenken først).
    func signUp(email: String, password: String, fullName: String, phone: String, plate: String) async throws -> AuthSession? {
        let body: [String: Any] = [
            "email": email,
            "password": password,
            "data": ["full_name": fullName, "phone": phone, "license_plate": Plate.normalize(plate)],
        ]
        let data = try await auth("signup?redirect_to=\(SupabaseConfig.siteURL)", body: body)
        let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
        return json?["access_token"] == nil ? nil : try storeSession(from: data)
    }

    func sendPasswordReset(email: String) async throws {
        let redirect = "\(SupabaseConfig.siteURL)/tilbakestill-passord"
        _ = try await auth("recover?redirect_to=\(redirect)", body: ["email": email])
    }

    func updatePassword(_ password: String) async throws {
        _ = try await request("auth/v1/user", method: "PUT", body: ["password": password])
    }

    /// Logger ut på denne telefonen, eller på alle enheter med `everywhere`.
    func signOut(everywhere: Bool) async {
        if session != nil {
            _ = try? await request("auth/v1/logout?scope=\(everywhere ? "global" : "local")", method: "POST", body: [String: String]())
        }
        clearSession()
    }

    func deleteOwnAccount() async throws {
        _ = try await request("rest/v1/rpc/delete_own_account", method: "POST", body: [String: String]())
        clearSession()
    }

    func clearSession() {
        session = nil
        Keychain.deleteSession()
    }

    // MARK: Data

    func fetchProfile() async throws -> DBProfile? {
        guard let s = session else { throw SupabaseError.notLoggedIn }
        let data = try await request("rest/v1/profiles?id=eq.\(s.userId)&select=id,full_name,phone,role,notify_email", method: "GET")
        return try decoder.decode([DBProfile].self, from: data).first
    }

    func updateProfile(_ fields: [String: Any]) async throws {
        guard let s = session else { throw SupabaseError.notLoggedIn }
        _ = try await request("rest/v1/profiles?id=eq.\(s.userId)", method: "PATCH", body: fields)
    }

    func fetchVehicles() async throws -> [DBVehicle] {
        guard let s = session else { throw SupabaseError.notLoggedIn }
        let data = try await request("rest/v1/vehicles?user_id=eq.\(s.userId)&select=id,plate&order=created_at.asc", method: "GET")
        return try decoder.decode([DBVehicle].self, from: data)
    }

    func addVehicle(plate: String) async throws {
        guard let s = session else { throw SupabaseError.notLoggedIn }
        _ = try await request("rest/v1/vehicles", method: "POST", body: ["user_id": s.userId, "plate": Plate.normalize(plate)])
    }

    func removeVehicle(id: String) async throws {
        _ = try await request("rest/v1/vehicles?id=eq.\(id)", method: "DELETE")
    }

    /// Alle bøter brukeren har tilgang til (egne + bøter på egne skilt). Filtreres av RLS i databasen.
    func fetchFines() async throws -> [DBFine] {
        let data = try await request("rest/v1/fines?select=id,plate,location,area,amount,issue_date,deadline,status,reference&order=issue_date.desc.nullslast", method: "GET")
        return try decoder.decode([DBFine].self, from: data)
    }

    // MARK: Nettverk

    private func auth(_ path: String, body: [String: Any]) async throws -> Data {
        var req = URLRequest(url: URL(string: "auth/v1/\(path)", relativeTo: SupabaseConfig.url)!)
        req.httpMethod = "POST"
        req.setValue(SupabaseConfig.key, forHTTPHeaderField: "apikey")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        return try await send(req)
    }

    /// Kall som krever innlogging. Fornyer tilgangen automatisk når den er i ferd med å gå ut.
    private func request(_ path: String, method: String, body: Any? = nil) async throws -> Data {
        let token = try await validAccessToken()
        var req = URLRequest(url: URL(string: path, relativeTo: SupabaseConfig.url)!)
        req.httpMethod = method
        req.setValue(SupabaseConfig.key, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let body { req.httpBody = try JSONSerialization.data(withJSONObject: body) }
        return try await send(req)
    }

    private func validAccessToken() async throws -> String {
        guard let s = session else { throw SupabaseError.notLoggedIn }
        if s.expiresAt.timeIntervalSinceNow > 60 { return s.accessToken }
        let data = try await auth("token?grant_type=refresh_token", body: ["refresh_token": s.refreshToken])
        return try storeSession(from: data).accessToken
    }

    private func send(_ req: URLRequest) async throws -> Data {
        var req = req
        req.timeoutInterval = 20
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await urlSession.data(for: req)
        } catch {
            throw SupabaseError.network
        }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
            let raw = [json?["msg"], json?["message"], json?["error_description"], json?["error_code"], json?["error"]]
                .compactMap { $0 as? String }.joined(separator: " ")
            if status == 401, req.url?.path.contains("/token") == true { clearSession() }
            throw SupabaseError.friendly(raw, status: status)
        }
        return data
    }

    private struct TokenResponse: Decodable {
        struct User: Decodable { let id: String; let email: String? }
        let accessToken: String
        let refreshToken: String
        let expiresIn: Double
        let user: User
    }

    @discardableResult
    private func storeSession(from data: Data) throws -> AuthSession {
        guard let t = try? decoder.decode(TokenResponse.self, from: data) else {
            throw SupabaseError(message: "Uventet svar fra serveren. Prøv igjen.")
        }
        let s = AuthSession(accessToken: t.accessToken, refreshToken: t.refreshToken,
                            expiresAt: Date().addingTimeInterval(t.expiresIn),
                            userId: t.user.id, email: t.user.email ?? "")
        session = s
        Keychain.saveSession(s)
        return s
    }
}

// MARK: - Registreringsnummer
enum Plate {
    /// "ab 12345" → "AB12345"
    static func normalize(_ plate: String) -> String {
        plate.uppercased().filter { ($0.isLetter && $0.isASCII) || $0.isNumber }
    }

    /// "AB12345" → "AB 12345"
    static func format(_ plate: String) -> String {
        let p = normalize(plate)
        guard let firstDigit = p.firstIndex(where: \.isNumber), firstDigit != p.startIndex,
              p[firstDigit...].allSatisfy(\.isNumber) else { return p }
        return "\(p[..<firstDigit]) \(p[firstDigit...])"
    }

    static func isValid(_ plate: String) -> Bool {
        let p = normalize(plate)
        return (2...8).contains(p.count)
    }
}

// MARK: - Nøkkelring (Keychain)
private enum Keychain {
    private static let service = "no.parkeringsbot.session"
    private static let account = "supabase"

    static func saveSession(_ session: AuthSession) {
        guard let data = try? JSONEncoder().encode(session) else { return }
        deleteSession()
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
            kSecValueData as String: data,
        ]
        SecItemAdd(query as CFDictionary, nil)
    }

    static func loadSession() -> AuthSession? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess, let data = item as? Data else { return nil }
        return try? JSONDecoder().decode(AuthSession.self, from: data)
    }

    static func deleteSession() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
