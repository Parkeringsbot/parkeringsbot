import Foundation

// MARK: - Kjøretøyinfo brukt i appen
struct VehicleInfo: Equatable {
    let licensePlate: String
    let make: String?
    let model: String?
    let vehicleType: String?
    let color: String?
    let fuel: String?
    let registrationStatus: String?
    let firstRegistered: Date?
    let nextInspection: Date?
    let lastInspection: Date?

    var makeAndModel: String? {
        let parts = [make, model].compactMap { $0 }.filter { !$0.isEmpty }
        return parts.isEmpty ? nil : parts.joined(separator: " ")
    }

    var isInspectionOverdue: Bool {
        guard let nextInspection else { return false }
        return nextInspection < Calendar.current.startOfDay(for: Date())
    }
}

enum VegvesenError: LocalizedError, Equatable {
    case notFound
    case unauthorized
    case rateLimited
    case server(Int)
    case network

    var errorDescription: String? {
        switch self {
        case .notFound:     return "Fant ikke kjøretøyet. Sjekk at registreringsnummeret er riktig."
        case .unauthorized: return "Tilgangen til Statens vegvesen ble avvist. API-nøkkelen kan være ugyldig."
        case .rateLimited:  return "For mange oppslag akkurat nå. Prøv igjen om litt."
        case .server:       return "Statens vegvesen svarer ikke som forventet. Prøv igjen senere."
        case .network:      return "Ingen kontakt med Statens vegvesen. Sjekk internettforbindelsen."
        }
    }
}

// MARK: - Klient for Statens vegvesens API for kjøretøyopplysninger
// Dokumentasjon: https://autosys-kjoretoy-api.atlas.vegvesen.no/api-ui/index-enkeltoppslag.html
struct VegvesenAPI {
    var apiKey: String = Secrets.vegvesenAPIKey
    var session: URLSession = .shared

    private static let baseURL = URL(string: "https://akfell-datautlevering.atlas.vegvesen.no/enkeltoppslag/kjoretoydata")!

    /// "ab 12345" → "AB12345"
    static func normalize(_ plate: String) -> String {
        plate.uppercased().filter { $0.isLetter || $0.isNumber }
    }

    func vehicle(licensePlate: String) async throws -> VehicleInfo {
        let plate = Self.normalize(licensePlate)
        guard !plate.isEmpty else { throw VegvesenError.notFound }

        var components = URLComponents(url: Self.baseURL, resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "kjennemerke", value: plate)]
        var request = URLRequest(url: components.url!)
        request.setValue("Apikey \(apiKey)", forHTTPHeaderField: "SVV-Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.timeoutInterval = 15

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw VegvesenError.network
        }

        switch (response as? HTTPURLResponse)?.statusCode ?? 0 {
        case 200: break
        case 204, 404: throw VegvesenError.notFound
        case 401, 403: throw VegvesenError.unauthorized
        case 429:      throw VegvesenError.rateLimited
        case let code: throw VegvesenError.server(code)
        }

        guard let dto = try? JSONDecoder().decode(KjoretoydataResponse.self, from: data),
              let first = dto.kjoretoydataListe?.first else {
            throw VegvesenError.notFound
        }
        return VehicleInfo(dto: first, fallbackPlate: licensePlate)
    }
}

// MARK: - Datamodell for svaret (bare feltene appen bruker; alt er valgfritt)
private struct KjoretoydataResponse: Decodable {
    let kjoretoydataListe: [Kjoretoydata]?
}

private struct Kode: Decodable {
    let kodeNavn: String?
    let kodeBeskrivelse: String?
}

private struct Kjoretoydata: Decodable {
    struct KjoretoyId: Decodable { let kjennemerke: String? }
    struct Forstegangsregistrering: Decodable { let registrertForstegangNorgeDato: String? }
    struct Registrering: Decodable { let registreringsstatus: Kode? }
    struct PeriodiskKontroll: Decodable { let kontrollfrist: String?; let sistGodkjent: String? }
    struct Godkjenning: Decodable { let tekniskGodkjenning: TekniskGodkjenning? }
    struct TekniskGodkjenning: Decodable { let tekniskeData: TekniskeData? }
    struct TekniskeData: Decodable {
        let generelt: Generelt?
        let karosseriOgLasteplan: Karosseri?
        let motorOgDrivverk: MotorOgDrivverk?
    }
    struct Generelt: Decodable {
        struct Merke: Decodable { let merke: String? }
        let merke: [Merke]?
        let handelsbetegnelse: [String]?
        let tekniskKode: Kode?
    }
    struct Karosseri: Decodable { let rFarge: [Kode]? }
    struct MotorOgDrivverk: Decodable {
        struct Motor: Decodable {
            struct Drivstoff: Decodable { let drivstoffKode: Kode? }
            let drivstoff: [Drivstoff]?
        }
        let motor: [Motor]?
    }

    let kjoretoyId: KjoretoyId?
    let forstegangsregistrering: Forstegangsregistrering?
    let registrering: Registrering?
    let periodiskKjoretoyKontroll: PeriodiskKontroll?
    let godkjenning: Godkjenning?
}

private extension VehicleInfo {
    init(dto: Kjoretoydata, fallbackPlate: String) {
        let data = dto.godkjenning?.tekniskGodkjenning?.tekniskeData
        let fuels = data?.motorOgDrivverk?.motor?
            .flatMap { $0.drivstoff ?? [] }
            .compactMap { $0.drivstoffKode?.kodeNavn } ?? []
        var uniqueFuels: [String] = []
        for fuel in fuels where !uniqueFuels.contains(fuel) { uniqueFuels.append(fuel) }

        self.init(
            licensePlate: dto.kjoretoyId?.kjennemerke ?? fallbackPlate,
            make: Self.prettify(data?.generelt?.merke?.first?.merke),
            model: Self.prettify(data?.generelt?.handelsbetegnelse?.first),
            vehicleType: data?.generelt?.tekniskKode?.kodeNavn,
            color: data?.karosseriOgLasteplan?.rFarge?.first?.kodeNavn,
            fuel: uniqueFuels.isEmpty ? nil : uniqueFuels.joined(separator: " / "),
            registrationStatus: dto.registrering?.registreringsstatus?.kodeNavn,
            firstRegistered: Self.parseDate(dto.forstegangsregistrering?.registrertForstegangNorgeDato),
            nextInspection: Self.parseDate(dto.periodiskKjoretoyKontroll?.kontrollfrist),
            lastInspection: Self.parseDate(dto.periodiskKjoretoyKontroll?.sistGodkjent)
        )
    }

    /// "TOYOTA" → "Toyota", men korte forkortelser som "BMW" beholdes.
    static func prettify(_ string: String?) -> String? {
        guard let string, !string.isEmpty else { return nil }
        return string.count <= 3 ? string : string.capitalized
    }

    static func parseDate(_ string: String?) -> Date? {
        guard let string else { return nil }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "Europe/Oslo")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: string)
    }
}
