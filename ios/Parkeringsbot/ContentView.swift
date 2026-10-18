import SwiftUI
import UIKit
import Combine

// MARK: - Design tokens
// Hver farge har en lys og en mørk variant. Alle tekstfarger har minst 4,5:1 kontrast
// mot bakgrunnen de brukes på (WCAG 2.1 AA), i begge modusene.
private extension Color {
    static func dynamic(_ light: (CGFloat, CGFloat, CGFloat), _ dark: (CGFloat, CGFloat, CGFloat)) -> Color {
        Color(UIColor { traits in
            let c = traits.userInterfaceStyle == .dark ? dark : light
            return UIColor(red: c.0, green: c.1, blue: c.2, alpha: 1)
        })
    }

    // Faste merkefarger (brukes bak hvit tekst i begge moduser)
    static let pbNavy        = Color(red: 0.039, green: 0.086, blue: 0.157)
    static let pbBlue        = Color(red: 0.145, green: 0.392, blue: 0.922)
    static let pbBlue2       = Color(red: 0.110, green: 0.302, blue: 0.839)
    static let pbBlue3       = Color(red: 0.118, green: 0.227, blue: 0.686)
    static let pbLink        = Color(red: 0.376, green: 0.643, blue: 0.980)

    // Flater og tekst
    static let pbBg          = dynamic((0.945, 0.949, 0.969), (0.050, 0.060, 0.080))
    static let pbCard        = dynamic((1.000, 1.000, 1.000), (0.110, 0.120, 0.150))
    static let pbText        = dynamic((0.070, 0.070, 0.070), (0.950, 0.950, 0.970))
    static let pbLabel       = dynamic((0.216, 0.255, 0.318), (0.780, 0.800, 0.840))
    static let pbSub         = dynamic((0.360, 0.390, 0.440), (0.660, 0.690, 0.740))
    static let pbBorder      = dynamic((0.820, 0.835, 0.863), (0.300, 0.320, 0.360))
    static let pbInputBorder = dynamic((0.470, 0.500, 0.550), (0.500, 0.530, 0.580))
    static let pbInputBg     = dynamic((0.973, 0.976, 0.984), (0.160, 0.170, 0.200))
    static let pbAccent      = dynamic((0.145, 0.392, 0.922), (0.450, 0.620, 1.000))

    // Status
    static let pbRed         = dynamic((0.725, 0.110, 0.110), (0.980, 0.550, 0.550))
    static let pbGreen       = dynamic((0.082, 0.502, 0.239), (0.400, 0.850, 0.550))
    static let pbOrange      = dynamic((0.761, 0.255, 0.047), (0.980, 0.650, 0.350))
    static let pbRedBg       = dynamic((0.996, 0.949, 0.949), (0.300, 0.100, 0.100))
    static let pbGreenBg     = dynamic((0.941, 0.992, 0.957), (0.070, 0.240, 0.130))
    static let pbOrangeBg    = dynamic((1.000, 0.969, 0.929), (0.300, 0.170, 0.060))
}

// MARK: - Utseende (lys / mørk / følg systemet)
enum AppTheme: String, CaseIterable, Identifiable {
    case system, light, dark
    var id: String { rawValue }
    var label: String {
        switch self {
        case .system: return "System"
        case .light:  return "Lys"
        case .dark:   return "Mørk"
        }
    }
    var interfaceStyle: UIUserInterfaceStyle {
        switch self {
        case .system: return .unspecified
        case .light:  return .light
        case .dark:   return .dark
        }
    }

    // Setter stilen på hele vinduet, slik at også systemelementer (tastatur, dialoger, fanelinje) følger valget.
    func apply() {
        for scene in UIApplication.shared.connectedScenes {
            (scene as? UIWindowScene)?.windows.forEach { $0.overrideUserInterfaceStyle = interfaceStyle }
        }
    }
}

// Tekststiler som følger brukerens valgte tekststørrelse (Dynamic Type).
private extension Font {
    static func pb(_ style: Font.TextStyle, _ weight: Font.Weight = .regular) -> Font {
        .system(style, design: .default, weight: weight)
    }
}

private func announce(_ message: String) {
    UIAccessibility.post(notification: .announcement, argument: message)
}

// MARK: - Models
struct ParkingFine: Identifiable, Equatable {
    let id: String
    let licensePlate: String
    let location: String
    let amount: Int
    let date: String
    let deadline: String?
    let reference: String?
    let isOverdue: Bool
    var status: FineStatus

    init(_ f: DBFine) {
        id = f.id
        licensePlate = Plate.format(f.plate)
        location = [f.location, f.area].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: ", ")
        amount = f.amount
        date = formatISODate(f.issueDate) ?? ""
        deadline = formatISODate(f.deadline)
        reference = f.reference
        status = FineStatus(db: f.status)
        let today = ISO8601DateFormatter.string(from: Date(), timeZone: TimeZone(identifier: "Europe/Oslo")!, formatOptions: [.withFullDate])
        isOverdue = status == .unpaid && (f.deadline.map { $0 < today } ?? false)
    }

    var accessibilityText: String {
        var parts = ["\(status.label), \(amount) kroner.", location.isEmpty ? "Ukjent sted." : "\(location).", date.isEmpty ? "" : "\(date)."]
        if let deadline, status == .unpaid { parts.append("Frist \(deadline).") }
        parts.append("Registreringsnummer \(licensePlate).")
        return parts.filter { !$0.isEmpty }.joined(separator: " ")
    }
}

enum FineStatus: CaseIterable {
    case unpaid, paid, pending

    init(db: String) {
        switch db {
        case "betalt":  self = .paid
        case "pending": self = .pending
        default:        self = .unpaid
        }
    }
    var label: String {
        switch self {
        case .unpaid:  return "Ubetalt"
        case .paid:    return "Betalt"
        case .pending: return "Under behandling"
        }
    }
    var color: Color {
        switch self {
        case .unpaid:  return .pbRed
        case .paid:    return .pbGreen
        case .pending: return .pbOrange
        }
    }
    var bgColor: Color {
        switch self {
        case .unpaid:  return .pbRedBg
        case .paid:    return .pbGreenBg
        case .pending: return .pbOrangeBg
        }
    }
    var icon: String {
        switch self {
        case .unpaid:  return "car.fill"
        case .paid:    return "checkmark.circle.fill"
        case .pending: return "doc.text.fill"
        }
    }
}

/// "1650" → "1 650 kr"
func kr(_ amount: Int) -> String {
    let f = NumberFormatter()
    f.locale = Locale(identifier: "nb_NO")
    f.numberStyle = .decimal
    return "\(f.string(from: NSNumber(value: amount)) ?? "\(amount)") kr"
}

/// "2026-09-15" → "15. september 2026"
func formatISODate(_ iso: String?) -> String? {
    guard let iso, !iso.isEmpty else { return nil }
    let parser = DateFormatter()
    parser.locale = Locale(identifier: "en_US_POSIX")
    parser.dateFormat = "yyyy-MM-dd"
    guard let date = parser.date(from: String(iso.prefix(10))) else { return iso }
    return longDateFormatter.string(from: date)
}

let longDateFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "nb_NO")
    formatter.dateStyle = .long
    return formatter
}()

// MARK: - App State
@MainActor
final class AppState: ObservableObject {
    enum Screen: Equatable { case loading, login, register, forgot, dashboard }

    @Published var screen: Screen = .loading
    @Published var email = ""
    @Published var profile: DBProfile?
    @Published var vehicles: [DBVehicle] = []
    @Published var fines: [ParkingFine] = []
    @Published var flash = ""
    @Published var dataError: String?

    enum VehicleLoadState: Equatable {
        case idle, loading, loaded(VehicleInfo), failed(String)
    }
    @Published var vehicleState: VehicleLoadState = .idle

    private let api = SupabaseService.shared
    private let vegvesen = VegvesenAPI()

    var fullName: String { profile?.fullName.isEmpty == false ? profile!.fullName : String(email.split(separator: "@").first ?? "") }
    var userName: String { fullName.components(separatedBy: " ").first ?? fullName }
    var phone: String? { profile?.phone }
    var licensePlate: String { vehicles.first.map { Plate.format($0.plate) } ?? "" }
    var isAdmin: Bool { profile?.role == "admin" }
    var roleLabel: String? {
        switch profile?.role {
        case "admin":   return "Administrator"
        case "bedrift": return "Bedrift"
        default:        return nil
        }
    }

    // MARK: Oppstart og lasting

    func start() async {
        guard let s = api.session else { screen = .login; return }
        email = s.email
        await loadAll()
    }

    func loadAll() async {
        do {
            async let p = api.fetchProfile()
            async let v = api.fetchVehicles()
            async let f = api.fetchFines()
            let (loadedProfile, loadedVehicles, loadedFines) = try await (p, v, f)
            profile = loadedProfile
            vehicles = loadedVehicles
            fines = loadedFines.map(ParkingFine.init)
            dataError = nil
            screen = .dashboard
        } catch {
            if api.session == nil {
                resetLocalState(message: "Innloggingen er utløpt. Logg inn på nytt.")
                return
            }
            dataError = message(error)
            screen = .dashboard
            announce(dataError ?? "")
        }
        await loadVehicle()
    }

    func loadVehicle() async {
        guard !licensePlate.isEmpty else { vehicleState = .idle; return }
        vehicleState = .loading
        do {
            vehicleState = .loaded(try await vegvesen.vehicle(licensePlate: licensePlate))
        } catch {
            let text = message(error)
            vehicleState = .failed(text)
            announce(text)
        }
    }

    // MARK: Innlogging

    func signIn(email: String, password: String) async -> String? {
        do {
            let s = try await api.signIn(email: email, password: password)
            self.email = s.email
            flash = ""
            await loadAll()
            return nil
        } catch { return message(error) }
    }

    func signUp(email: String, password: String, fullName: String, phone: String, plate: String) async -> String? {
        do {
            if let s = try await api.signUp(email: email, password: password, fullName: fullName, phone: phone, plate: plate) {
                self.email = s.email
                await loadAll()
            } else {
                flash = "Kontoen er opprettet. Vi har sendt deg en e-post – trykk på lenken for å bekrefte adressen, og logg så inn."
                screen = .login
                announce(flash)
            }
            return nil
        } catch { return message(error) }
    }

    func sendPasswordReset(email: String) async -> String? {
        do { try await api.sendPasswordReset(email: email); return nil } catch { return message(error) }
    }

    func logout(everywhere: Bool) async {
        await api.signOut(everywhere: everywhere)
        resetLocalState(message: everywhere ? "Du er logget ut fra alle enheter." : "")
    }

    func deleteAccount() async -> String? {
        do {
            try await api.deleteOwnAccount()
            resetLocalState(message: "Kontoen din er slettet.")
            return nil
        } catch { return message(error) }
    }

    private func resetLocalState(message: String) {
        profile = nil; vehicles = []; fines = []; email = ""; dataError = nil
        vehicleState = .idle
        flash = message
        screen = .login
        if !message.isEmpty { announce(message) }
    }

    // MARK: Profil

    func updateContact(name: String, phone: String) async -> String? {
        do {
            try await api.updateProfile(["full_name": name, "phone": phone.isEmpty ? NSNull() : phone])
            profile?.fullName = name
            profile?.phone = phone.isEmpty ? nil : phone
            return nil
        } catch { return message(error) }
    }

    func setNotify(_ on: Bool) async -> String? {
        let previous = profile?.notifyEmail
        profile?.notifyEmail = on
        do {
            try await api.updateProfile(["notify_email": on])
            announce(on ? "E-postvarsler er slått på" : "E-postvarsler er slått av")
            return nil
        } catch {
            if let previous { profile?.notifyEmail = previous }
            return message(error)
        }
    }

    func changePassword(_ password: String) async -> String? {
        do { try await api.updatePassword(password); return nil } catch { return message(error) }
    }

    func addVehicle(plate: String) async -> String? {
        guard Plate.isValid(plate) else { return "Ugyldig registreringsnummer." }
        do {
            try await api.addVehicle(plate: plate)
            await reloadVehiclesAndFines()
            return nil
        } catch { return message(error) }
    }

    func removeVehicle(_ vehicle: DBVehicle) async -> String? {
        do {
            try await api.removeVehicle(id: vehicle.id)
            await reloadVehiclesAndFines()
            return nil
        } catch { return message(error) }
    }

    private func reloadVehiclesAndFines() async {
        let oldPlate = licensePlate
        if let v = try? await api.fetchVehicles() { vehicles = v }
        if let f = try? await api.fetchFines() { fines = f.map(ParkingFine.init) }
        if licensePlate != oldPlate { await loadVehicle() }
    }

    private func message(_ error: Error) -> String {
        (error as? LocalizedError)?.errorDescription ?? "Noe gikk galt. Prøv igjen."
    }
}

// MARK: - Root
struct ContentView: View {
    @StateObject var state = AppState()
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @AppStorage("appTheme") private var theme: AppTheme = .system

    var body: some View {
        Group {
            switch state.screen {
            case .loading:
                ZStack {
                    Color.pbNavy.ignoresSafeArea()
                    ProgressView("Laster …").tint(.white).foregroundColor(.white)
                }
            case .login:     LoginView(state: state)
            case .register:  RegisterView(state: state)
            case .forgot:    ForgotPasswordView(state: state)
            case .dashboard: DashboardView(state: state)
            }
        }
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.2), value: state.screen)
        .task { await state.start() }
        .onAppear { theme.apply() }
        .onChange(of: theme) { newTheme in newTheme.apply() }
    }
}

// MARK: - Shared: auth layout
private struct AuthLogo: View {
    let size: CGFloat
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size / 4)
                .fill(LinearGradient(colors: [.pbBlue, .pbBlue2], startPoint: .topLeading, endPoint: .bottomTrailing))
                .frame(width: size, height: size)
                .shadow(color: Color.pbBlue.opacity(0.5), radius: 16)
            Text("P").font(.system(size: size * 0.5, weight: .heavy)).foregroundColor(.white)
        }
        .accessibilityHidden(true)
    }
}

private struct AuthScreen<Content: View>: View {
    @ViewBuilder let content: () -> Content
    var body: some View {
        GeometryReader { geo in
            ScrollView {
                VStack(spacing: 0) { content() }
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: geo.size.height)
                    .padding(.vertical, 24)
            }
        }
        .background(Color.pbNavy.ignoresSafeArea())
    }
}

struct ErrorText: View {
    let message: String
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Image(systemName: "exclamationmark.circle.fill").accessibilityHidden(true)
            Text(message)
        }
        .font(.pb(.footnote, .medium))
        .foregroundColor(.pbRed)
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Feil: \(message)")
    }
}

struct NoticeText: View {
    let message: String
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Image(systemName: "checkmark.circle.fill").accessibilityHidden(true)
            Text(message)
        }
        .font(.pb(.footnote, .medium))
        .foregroundColor(.pbGreen)
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.pbGreenBg).cornerRadius(10)
        .accessibilityElement(children: .combine)
    }
}

private struct AuthFooterLink: View {
    let lead: String?
    let action: String
    let onTap: () -> Void
    var body: some View {
        Button(action: onTap) {
            ViewThatFits {
                HStack(spacing: 4) { leadText; actionText }
                VStack(spacing: 2) { leadText; actionText }
            }
            .font(.pb(.footnote))
            .frame(minHeight: 44)
            .padding(.horizontal, 24)
        }
        .padding(.top, 12)
        .accessibilityLabel(action)
        .accessibilityHint(lead ?? "")
    }
    @ViewBuilder private var leadText: some View { if let lead { Text(lead).foregroundColor(.white.opacity(0.75)) } }
    private var actionText: some View { Text(action).foregroundColor(.pbLink).fontWeight(.semibold).underline() }
}

// MARK: - Login
struct LoginView: View {
    @ObservedObject var state: AppState
    @State private var email = ""
    @State private var password = ""
    @State private var errorMessage = ""
    @State private var busy = false

    var body: some View {
        AuthScreen {
            VStack(spacing: 10) {
                AuthLogo(size: 72)
                Text("Parkeringsbot").font(.pb(.title, .bold)).foregroundColor(.white)
                    .accessibilityAddTraits(.isHeader)
                Text("Håndter parkeringsbøtene dine enkelt og digitalt")
                    .font(.pb(.footnote)).foregroundColor(.white.opacity(0.75)).multilineTextAlignment(.center)
            }
            .padding(.bottom, 32).padding(.horizontal, 24)

            VStack(spacing: 14) {
                if !state.flash.isEmpty { NoticeText(message: state.flash) }
                PBTextField(label: "E-post", placeholder: "ola.nordmann@epost.no", text: $email,
                            keyboard: .emailAddress, contentType: .username, capitalization: .never)
                PBTextField(label: "Passord", placeholder: "", text: $password,
                            contentType: .password, secure: true)
                if !errorMessage.isEmpty { ErrorText(message: errorMessage) }
                PBPrimaryButton(title: busy ? "Logger inn …" : "Logg inn", action: login)
                    .disabled(busy)
                Button("Glemt passord?") { state.flash = ""; state.screen = .forgot }
                    .font(.pb(.subheadline, .semibold)).foregroundColor(.pbAccent)
                    .frame(minHeight: 44)
            }
            .padding(20).background(Color.pbCard).cornerRadius(20).padding(.horizontal, 24)

            AuthFooterLink(lead: "Har du ikke konto?", action: "Opprett konto gratis") {
                state.flash = ""; state.screen = .register
            }
        }
    }

    func login() {
        let mail = email.trimmingCharacters(in: .whitespaces)
        guard !mail.isEmpty, !password.isEmpty else {
            errorMessage = "Skriv inn e-post og passord."
            announce(errorMessage)
            return
        }
        busy = true; errorMessage = ""
        Task {
            if let error = await state.signIn(email: mail, password: password) {
                errorMessage = error
                announce(error)
            }
            busy = false
        }
    }
}

// MARK: - Register
struct RegisterView: View {
    @ObservedObject var state: AppState
    @State private var fullName     = ""
    @State private var email        = ""
    @State private var phone        = ""
    @State private var licensePlate = ""
    @State private var password     = ""
    @State private var errorMessage = ""
    @State private var busy = false

    var body: some View {
        AuthScreen {
            VStack(spacing: 10) {
                AuthLogo(size: 64)
                Text("Opprett konto").font(.pb(.title2, .bold)).foregroundColor(.white)
                    .accessibilityAddTraits(.isHeader)
            }
            .padding(.bottom, 24)

            VStack(spacing: 14) {
                PBTextField(label: "Fullt navn", placeholder: "Ola Nordmann", text: $fullName,
                            contentType: .name, capitalization: .words)
                PBTextField(label: "E-post", placeholder: "ola.nordmann@epost.no", text: $email,
                            keyboard: .emailAddress, contentType: .username, capitalization: .never)
                PBTextField(label: "Telefon (valgfritt)", placeholder: "+47 123 45 678", text: $phone,
                            keyboard: .phonePad, contentType: .telephoneNumber)
                PBTextField(label: "Registreringsnummer", placeholder: "AB 12345", text: $licensePlate,
                            keyboard: .asciiCapable, capitalization: .characters)
                PBTextField(label: "Passord (minst 8 tegn)", placeholder: "", text: $password,
                            contentType: .newPassword, secure: true)
                if !errorMessage.isEmpty { ErrorText(message: errorMessage) }
                PBPrimaryButton(title: busy ? "Oppretter …" : "Opprett konto", action: register)
                    .disabled(busy)
                Text("Ved registrering godtar du personvernerklæringen, som du finner under Profil.")
                    .font(.pb(.caption)).foregroundColor(.pbSub).multilineTextAlignment(.center)
            }
            .padding(20).background(Color.pbCard).cornerRadius(20).padding(.horizontal, 24)

            AuthFooterLink(lead: "Har du konto?", action: "Logg inn") { state.screen = .login }
        }
    }

    func register() {
        let name = fullName.trimmingCharacters(in: .whitespaces)
        let mail = email.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty, !mail.isEmpty, !licensePlate.isEmpty, !password.isEmpty else {
            return fail("Fyll ut navn, e-post, registreringsnummer og passord.")
        }
        guard Plate.isValid(licensePlate) else { return fail("Ugyldig registreringsnummer. Skriv det som på skiltet, for eksempel AB 12345.") }
        guard password.count >= 8 else { return fail("Passordet må ha minst 8 tegn.") }
        busy = true; errorMessage = ""
        Task {
            if let error = await state.signUp(email: mail, password: password, fullName: name,
                                              phone: phone.trimmingCharacters(in: .whitespaces), plate: licensePlate) {
                fail(error)
            }
            busy = false
        }
    }

    private func fail(_ message: String) {
        errorMessage = message
        announce(message)
    }
}

// MARK: - Glemt passord
struct ForgotPasswordView: View {
    @ObservedObject var state: AppState
    @State private var email = ""
    @State private var errorMessage = ""
    @State private var sent = false
    @State private var busy = false

    var body: some View {
        AuthScreen {
            VStack(spacing: 10) {
                AuthLogo(size: 64)
                Text("Glemt passord").font(.pb(.title2, .bold)).foregroundColor(.white)
                    .accessibilityAddTraits(.isHeader)
                Text("Vi sender deg en lenke for å lage nytt passord")
                    .font(.pb(.footnote)).foregroundColor(.white.opacity(0.75)).multilineTextAlignment(.center)
            }
            .padding(.bottom, 24).padding(.horizontal, 24)

            VStack(spacing: 14) {
                if sent {
                    NoticeText(message: "Hvis det finnes en konto for \(email), har vi sendt en e-post med lenke. Sjekk også søppelpost.")
                } else {
                    PBTextField(label: "E-post", placeholder: "ola.nordmann@epost.no", text: $email,
                                keyboard: .emailAddress, contentType: .username, capitalization: .never)
                    if !errorMessage.isEmpty { ErrorText(message: errorMessage) }
                    PBPrimaryButton(title: busy ? "Sender …" : "Send lenke", action: send).disabled(busy)
                }
            }
            .padding(20).background(Color.pbCard).cornerRadius(20).padding(.horizontal, 24)

            AuthFooterLink(lead: nil, action: "Tilbake til innlogging") { state.screen = .login }
        }
    }

    func send() {
        let mail = email.trimmingCharacters(in: .whitespaces)
        guard !mail.isEmpty else { errorMessage = "Skriv inn e-postadressen din."; announce(errorMessage); return }
        busy = true; errorMessage = ""
        Task {
            if let error = await state.sendPasswordReset(email: mail) {
                errorMessage = error; announce(error)
            } else {
                email = mail; sent = true
                announce("E-post med lenke er sendt.")
            }
            busy = false
        }
    }
}

// MARK: - Dashboard (tab container)
// Bruker systemets TabView, slik at VoiceOver kjenner igjen fanene og hvilken som er valgt.
struct DashboardView: View {
    @ObservedObject var state: AppState

    init(state: AppState) {
        _state = ObservedObject(wrappedValue: state)
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(Color.pbCard)
        let unselected = UIColor(Color.pbSub)
        appearance.stackedLayoutAppearance.normal.iconColor = unselected
        appearance.stackedLayoutAppearance.normal.titleTextAttributes = [.foregroundColor: unselected]
        appearance.inlineLayoutAppearance.normal.iconColor = unselected
        appearance.inlineLayoutAppearance.normal.titleTextAttributes = [.foregroundColor: unselected]
        appearance.compactInlineLayoutAppearance.normal.iconColor = unselected
        appearance.compactInlineLayoutAppearance.normal.titleTextAttributes = [.foregroundColor: unselected]
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }

    var body: some View {
        TabView {
            HomeTab(state: state)
                .tabItem { Label("Hjem", systemImage: "house.fill") }
            FinesTab(state: state)
                .tabItem { Label("Bøter", systemImage: "p.circle.fill") }
            ProfileTab(state: state)
                .tabItem { Label("Profil", systemImage: "person.fill") }
        }
        .tint(.pbAccent)
    }
}

private struct SectionTitle: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.pb(.caption, .bold)).foregroundColor(.pbLabel)
            .textCase(.uppercase).tracking(0.8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityAddTraits(.isHeader)
    }
}

// MARK: - Tab 0: Hjem
struct HomeTab: View {
    @ObservedObject var state: AppState
    @Environment(\.dynamicTypeSize) private var typeSize
    var unpaidFines: [ParkingFine] { state.fines.filter { $0.status == .unpaid } }
    var totalUnpaid: Int           { unpaidFines.reduce(0) { $0 + $1.amount } }
    var unpaidCountText: String    { unpaidFines.count == 1 ? "1 ubetalt bot" : "\(unpaidFines.count) ubetalte bøter" }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Header
                VStack(alignment: .leading, spacing: 0) {
                    VStack(alignment: .leading, spacing: 0) {
                        Text("God dag,").font(.pb(.caption)).foregroundColor(.white.opacity(0.75))
                        Text(state.userName)
                            .font(.pb(.title3, .bold)).foregroundColor(.white)
                    }
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel("God dag, \(state.userName)")
                    .accessibilityAddTraits(.isHeader)
                    .padding(.bottom, 14)

                    let layout = typeSize.isAccessibilitySize
                        ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12))
                        : AnyLayout(HStackLayout(alignment: .center))
                    layout {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Utestående bøter").font(.pb(.caption)).foregroundColor(.white)
                            Text(kr(totalUnpaid)).font(.pb(.title, .heavy)).foregroundColor(.white)
                            Text(unpaidCountText).font(.pb(.caption)).foregroundColor(.white)
                        }
                        .accessibilityElement(children: .ignore)
                        .accessibilityLabel("Utestående bøter: \(totalUnpaid) kroner, \(unpaidCountText)")
                        if !typeSize.isAccessibilitySize { Spacer() }
                        VStack(alignment: typeSize.isAccessibilitySize ? .leading : .center, spacing: 4) {
                            Button("Betal alle") {}
                                .font(.pb(.footnote, .semibold)).foregroundColor(.white)
                                .padding(.horizontal, 16).frame(minHeight: 44)
                                .background(Color.white.opacity(0.15))
                                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.white.opacity(0.6), lineWidth: 1.5))
                                .cornerRadius(10)
                                .disabled(true)
                                .accessibilityHint("Betaling kommer snart")
                            Text("Kommer snart").font(.pb(.caption2)).foregroundColor(.white)
                                .accessibilityHidden(true)
                        }
                    }
                    .padding(16)
                    .background(LinearGradient(colors: [.pbBlue, .pbBlue3], startPoint: .leading, endPoint: .trailing))
                    .cornerRadius(16)
                }
                .padding(.horizontal, 20).padding(.top, 12).padding(.bottom, 20)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.pbNavy)

                // Fine list
                VStack(alignment: .leading, spacing: 10) {
                    SectionTitle(text: "Mine bøter")
                        .padding(.top, 16).padding(.horizontal, 16)
                    if let dataError = state.dataError {
                        VStack(alignment: .leading, spacing: 8) {
                            ErrorText(message: dataError)
                            Button { Task { await state.loadAll() } } label: {
                                Label("Prøv igjen", systemImage: "arrow.clockwise").font(.pb(.subheadline, .semibold))
                                    .foregroundColor(.pbAccent).frame(minHeight: 44)
                            }
                        }
                        .padding(.horizontal, 16)
                    } else if state.fines.isEmpty {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Du har ingen registrerte bøter.").font(.pb(.subheadline, .medium)).foregroundColor(.pbText)
                            Text("Bøter på skiltene dine dukker opp her automatisk.").font(.pb(.footnote)).foregroundColor(.pbSub)
                        }
                        .padding(16).frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.pbCard).cornerRadius(14).padding(.horizontal, 16)
                    }
                    ForEach(state.fines) { fine in FineCard(fine: fine) }
                    Spacer().frame(height: 8)
                }
            }
        }
        .refreshable { await state.loadAll() }
        .navyStatusBarBackground()
    }
}

// Bakgrunn under innholdet, mørkeblått bak status bar.
private extension View {
    func navyStatusBarBackground() -> some View {
        self
            .background(Color.pbBg)
            .overlay {
                GeometryReader { geo in
                    VStack(spacing: 0) {
                        Color.pbNavy.frame(height: geo.safeAreaInsets.top)
                        Spacer(minLength: 0)
                    }
                    .ignoresSafeArea(edges: .top)
                }
                .allowsHitTesting(false)
                .accessibilityHidden(true)
            }
    }
}

// MARK: - Tab 1: Bøter
struct FinesTab: View {
    @ObservedObject var state: AppState
    @State private var filter: FineStatus? = nil

    var filtered: [ParkingFine] {
        guard let f = filter else { return state.fines }
        return state.fines.filter { $0.status == f }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(alignment: .leading, spacing: 12) {
                Text("Mine bøter").font(.pb(.title3, .bold)).foregroundColor(.white)
                    .accessibilityAddTraits(.isHeader)

                // Filter chips
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        FilterChip(label: "Alle",             isActive: filter == nil)      { filter = nil }
                        FilterChip(label: "Ubetalt",          isActive: filter == .unpaid)  { filter = .unpaid }
                        FilterChip(label: "Under behandling", isActive: filter == .pending) { filter = .pending }
                        FilterChip(label: "Betalt",           isActive: filter == .paid)    { filter = .paid }
                    }
                }
                .accessibilityElement(children: .contain)
                .accessibilityLabel("Filter")
            }
            .padding(.horizontal, 20).padding(.top, 12).padding(.bottom, 16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.pbNavy.ignoresSafeArea(edges: .top))

            // List
            ScrollView {
                VStack(spacing: 10) {
                    if filtered.isEmpty {
                        VStack(spacing: 12) {
                            Image(systemName: "p.circle").font(.system(size: 48)).foregroundColor(.pbBorder)
                                .accessibilityHidden(true)
                            Text(state.fines.isEmpty ? "Du har ingen registrerte bøter." : "Ingen bøter med dette filteret.")
                                .font(.pb(.subheadline, .medium)).foregroundColor(.pbSub)
                        }
                        .frame(maxWidth: .infinity).padding(.top, 80)
                    } else {
                        ForEach(filtered) { fine in FineCard(fine: fine, detailed: true) }
                    }
                    Spacer().frame(height: 8)
                }
                .padding(.top, 12)
            }
            .refreshable { await state.loadAll() }
        }
        .navyStatusBarBackground()
    }
}

struct FilterChip: View {
    let label: String
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.pb(.footnote, .semibold))
                .foregroundColor(isActive ? .white : .white.opacity(0.85))
                .padding(.horizontal, 14).frame(minHeight: 44)
                .background(isActive ? Color.pbBlue : Color.white.opacity(0.12))
                .cornerRadius(22)
                .overlay(
                    RoundedRectangle(cornerRadius: 22)
                        .stroke(isActive ? Color.clear : Color.white.opacity(0.4), lineWidth: 1)
                )
        }
        .accessibilityAddTraits(isActive ? .isSelected : [])
    }
}

// MARK: - Tab 2: Profil
struct ProfileTab: View {
    @ObservedObject var state: AppState
    @ScaledMetric private var avatarSize: CGFloat = 72

    @State private var showEditContact = false
    @State private var showChangePassword = false
    @State private var showDeleteAccount = false
    @State private var showPrivacy = false
    @State private var showLogoutChoice = false
    @State private var notice = ""
    @State private var settingsError = ""

    var totalPaid: Int { state.fines.filter { $0.status == .paid }.reduce(0) { $0 + $1.amount } }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                header
                VStack(spacing: 16) {
                    ViewThatFits {
                        HStack(spacing: 12) { stats }
                        VStack(spacing: 12) { stats }
                    }
                    .padding(.horizontal, 16)

                    if !notice.isEmpty { NoticeText(message: notice).padding(.horizontal, 16) }

                    VehicleSection(state: state)

                    ProfileSection(title: "Kontaktinfo") {
                        ProfileRow(icon: "person.fill", iconColor: .pbAccent, title: "Navn", value: state.fullName)
                        Divider().padding(.leading, 52)
                        ProfileRow(icon: "envelope.fill", iconColor: .pbAccent, title: "E-post", value: state.email)
                        Divider().padding(.leading, 52)
                        ProfileRow(icon: "phone.fill", iconColor: .pbAccent, title: "Telefon", value: state.phone ?? "Ikke oppgitt")
                        Divider().padding(.leading, 52)
                        ActionRow(icon: "pencil", title: "Endre navn og telefon") { notice = ""; showEditContact = true }
                    }

                    ProfileSection(title: "Innstillinger") {
                        ThemePickerRow()
                        Divider().padding(.leading, 52)
                        NotifyToggleRow(state: state, error: $settingsError)
                        if let role = state.roleLabel {
                            Divider().padding(.leading, 52)
                            ProfileRow(icon: "person.badge.shield.checkmark.fill", iconColor: .pbAccent, title: "Kontotype", value: role)
                        }
                    }
                    if !settingsError.isEmpty { ErrorText(message: settingsError).padding(.horizontal, 16) }

                    ProfileSection(title: "Konto og sikkerhet") {
                        ActionRow(icon: "key.fill", title: "Endre passord") { notice = ""; showChangePassword = true }
                        Divider().padding(.leading, 52)
                        ActionRow(icon: "rectangle.portrait.and.arrow.right", title: "Logg ut") { showLogoutChoice = true }
                        Divider().padding(.leading, 52)
                        ActionRow(icon: "trash.fill", title: "Slett kontoen min", tint: .pbRed) { showDeleteAccount = true }
                    }

                    ProfileSection(title: "Om") {
                        ActionRow(icon: "hand.raised.fill", title: "Personvernerklæring") { showPrivacy = true }
                        if state.isAdmin, let url = URL(string: "\(SupabaseConfig.siteURL)/admin") {
                            Divider().padding(.leading, 52)
                            Link(destination: url) {
                                ActionRowLabel(icon: "shield.lefthalf.filled", title: "Admin (åpnes på nettsiden)", trailing: "arrow.up.right")
                            }
                            .accessibilityHint("Åpner admin-siden i Safari")
                        }
                    }

                    Spacer().frame(height: 8)
                }
                .padding(.top, 16)
            }
        }
        .refreshable { await state.loadAll() }
        .navyStatusBarBackground()
        .confirmationDialog("Logg ut", isPresented: $showLogoutChoice, titleVisibility: .visible) {
            Button("Logg ut på denne telefonen") { Task { await state.logout(everywhere: false) } }
            Button("Logg ut fra alle enheter", role: .destructive) { Task { await state.logout(everywhere: true) } }
            Button("Avbryt", role: .cancel) {}
        } message: {
            Text("«Alle enheter» logger deg også ut av nettsiden og andre telefoner.")
        }
        .sheet(isPresented: $showEditContact) {
            EditContactSheet(state: state) { notice = "Kontaktinfo er lagret." }
        }
        .sheet(isPresented: $showChangePassword) {
            ChangePasswordSheet(state: state) { notice = "Passordet er endret." }
        }
        .sheet(isPresented: $showDeleteAccount) { DeleteAccountSheet(state: state) }
        .sheet(isPresented: $showPrivacy) { PrivacySheet() }
    }

    private var header: some View {
        VStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(LinearGradient(colors: [.pbBlue, .pbBlue2], startPoint: .topLeading, endPoint: .bottomTrailing))
                    .frame(width: avatarSize, height: avatarSize)
                Text(state.fullName.prefix(1).uppercased())
                    .font(.pb(.title, .bold)).foregroundColor(.white)
            }
            .accessibilityHidden(true)
            Text(state.fullName).font(.pb(.headline, .bold)).foregroundColor(.white)
                .accessibilityAddTraits(.isHeader)
            Text(state.email).font(.pb(.footnote)).foregroundColor(.white.opacity(0.75))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24).padding(.horizontal, 16)
        .background(Color.pbNavy)
    }

    @ViewBuilder private var stats: some View {
        StatCard(value: "\(state.fines.count)", label: "Bøter totalt", spokenValue: "\(state.fines.count)")
        StatCard(value: kr(totalPaid), label: "Betalt totalt", spokenValue: "\(totalPaid) kroner")
    }
}

// MARK: - Rader som gjør noe når man trykker
struct ActionRowLabel: View {
    let icon: String
    let title: String
    var tint: Color = .pbAccent
    var trailing: String = "chevron.right"
    @ScaledMetric private var iconBox: CGFloat = 32

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 8).fill(tint.opacity(0.12)).frame(width: min(iconBox, 48), height: min(iconBox, 48))
                Image(systemName: icon).foregroundColor(tint).font(.pb(.subheadline))
            }
            .accessibilityHidden(true)
            Text(title).font(.pb(.subheadline, .medium)).foregroundColor(tint == .pbRed ? .pbRed : .pbText)
                .multilineTextAlignment(.leading)
            Spacer()
            Image(systemName: trailing).font(.pb(.footnote, .semibold)).foregroundColor(.pbSub).accessibilityHidden(true)
        }
        .padding(14)
        .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
        .contentShape(Rectangle())
    }
}

struct ActionRow: View {
    let icon: String
    let title: String
    var tint: Color = .pbAccent
    let action: () -> Void
    var body: some View {
        Button(action: action) { ActionRowLabel(icon: icon, title: title, tint: tint) }
            .buttonStyle(.plain)
    }
}

struct NotifyToggleRow: View {
    @ObservedObject var state: AppState
    @Binding var error: String
    @ScaledMetric private var iconBox: CGFloat = 32

    var body: some View {
        Toggle(isOn: Binding(
            get: { state.profile?.notifyEmail ?? true },
            set: { value in Task { error = await state.setNotify(value) ?? "" } }
        )) {
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 8).fill(Color.pbOrange.opacity(0.12)).frame(width: min(iconBox, 48), height: min(iconBox, 48))
                    Image(systemName: "bell.fill").foregroundColor(.pbOrange).font(.pb(.subheadline))
                }
                .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 2) {
                    Text("E-postvarsel ved nye bøter").font(.pb(.subheadline)).foregroundColor(.pbText)
                    Text("Vi sender en e-post når en bot registreres på skiltet ditt.")
                        .font(.pb(.caption)).foregroundColor(.pbSub)
                }
            }
        }
        .tint(.pbGreen)
        .padding(14)
    }
}

// MARK: - Kjøretøy
struct VehicleSection: View {
    @ObservedObject var state: AppState
    @State private var newPlate = ""
    @State private var error = ""
    @State private var busy = false
    @State private var vehicleToRemove: DBVehicle?

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ProfileSection(title: "Kjøretøy") {
                if state.vehicles.isEmpty {
                    Text("Ingen kjøretøy lagt til ennå.")
                        .font(.pb(.subheadline)).foregroundColor(.pbSub)
                        .padding(14).frame(maxWidth: .infinity, alignment: .leading)
                }
                ForEach(state.vehicles) { v in
                    HStack(spacing: 12) {
                        ProfileRow(icon: "car.fill", iconColor: .pbAccent, title: Plate.format(v.plate), value: "")
                        Button {
                            vehicleToRemove = v
                        } label: {
                            Label("Fjern", systemImage: "trash").font(.pb(.subheadline, .semibold))
                                .foregroundColor(.pbRed).frame(minWidth: 44, minHeight: 44)
                        }
                        .padding(.trailing, 14)
                        .accessibilityLabel("Fjern \(Plate.format(v.plate))")
                    }
                    Divider().padding(.leading, 52)
                }

                vehicleInfo

                VStack(alignment: .leading, spacing: 8) {
                    HStack(alignment: .bottom, spacing: 10) {
                        PBTextField(label: "Legg til kjøretøy", placeholder: "AB 12345", text: $newPlate,
                                    keyboard: .asciiCapable, capitalization: .characters)
                        Button(action: add) {
                            Label("Legg til", systemImage: "plus").font(.pb(.subheadline, .semibold))
                                .foregroundColor(.white).padding(.horizontal, 14).frame(minHeight: 44)
                                .background(Color.pbBlue).cornerRadius(10)
                        }
                        .disabled(busy)
                    }
                    if !error.isEmpty { ErrorText(message: error) }
                }
                .padding(14)
            }

            if case .loaded = state.vehicleState {
                Text("Kilde: Statens vegvesen (\(state.licensePlate))")
                    .font(.pb(.caption)).foregroundColor(.pbSub)
                    .padding(.horizontal, 20)
            }
        }
        .confirmationDialog(
            "Fjerne \(vehicleToRemove.map { Plate.format($0.plate) } ?? "")?",
            isPresented: Binding(get: { vehicleToRemove != nil }, set: { if !$0 { vehicleToRemove = nil } }),
            titleVisibility: .visible
        ) {
            Button("Fjern kjøretøyet", role: .destructive) {
                guard let v = vehicleToRemove else { return }
                Task { error = await state.removeVehicle(v) ?? "" }
            }
            Button("Avbryt", role: .cancel) {}
        } message: {
            Text("Bøter på dette skiltet vises da ikke lenger i appen.")
        }
    }

    @ViewBuilder private var vehicleInfo: some View {
        switch state.vehicleState {
        case .idle:
            EmptyView()
        case .loading:
            HStack(spacing: 12) {
                ProgressView()
                Text("Henter info fra Statens vegvesen …").font(.pb(.subheadline)).foregroundColor(.pbSub)
            }
            .padding(14).frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityElement(children: .combine)
            Divider().padding(.leading, 52)
        case .loaded(let vehicle):
            ForEach(rows(for: vehicle), id: \.title) { row in
                ProfileRow(icon: row.icon, iconColor: row.iconColor, title: row.title, value: row.value, valueColor: row.valueColor)
                Divider().padding(.leading, 52)
            }
        case .failed(let message):
            VStack(alignment: .leading, spacing: 8) {
                ErrorText(message: message)
                Button { Task { await state.loadVehicle() } } label: {
                    Label("Prøv igjen", systemImage: "arrow.clockwise")
                        .font(.pb(.subheadline, .semibold)).foregroundColor(.pbAccent).frame(minHeight: 44)
                }
            }
            .padding(.horizontal, 14).padding(.top, 10)
            .frame(maxWidth: .infinity, alignment: .leading)
            Divider().padding(.leading, 52)
        }
    }

    private func add() {
        let plate = newPlate
        busy = true; error = ""
        Task {
            if let message = await state.addVehicle(plate: plate) {
                error = message; announce(message)
            } else {
                newPlate = ""
                announce("\(Plate.format(plate)) er lagt til.")
            }
            busy = false
        }
    }

    private struct Row {
        let icon: String
        let iconColor: Color
        let title: String
        let value: String
        var valueColor: Color = .pbSub
    }

    private func rows(for v: VehicleInfo) -> [Row] {
        var rows: [Row] = []
        if let name = v.makeAndModel {
            rows.append(Row(icon: "tag.fill", iconColor: .pbAccent, title: "Merke og modell", value: name))
        }
        if let type = v.vehicleType {
            rows.append(Row(icon: "info.circle.fill", iconColor: .pbAccent, title: "Type", value: type))
        }
        if let color = v.color {
            rows.append(Row(icon: "paintpalette.fill", iconColor: .pbAccent, title: "Farge", value: color))
        }
        if let fuel = v.fuel {
            rows.append(Row(icon: "fuelpump.fill", iconColor: .pbAccent, title: "Drivstoff", value: fuel))
        }
        if let date = v.firstRegistered {
            rows.append(Row(icon: "calendar", iconColor: .pbAccent, title: "Først registrert", value: longDateFormatter.string(from: date)))
        }
        if let date = v.nextInspection {
            let overdue = v.isInspectionOverdue
            rows.append(Row(icon: overdue ? "exclamationmark.triangle.fill" : "checkmark.seal.fill",
                            iconColor: overdue ? .pbRed : .pbGreen,
                            title: overdue ? "EU-kontroll (fristen er passert)" : "Neste EU-kontroll",
                            value: longDateFormatter.string(from: date),
                            valueColor: overdue ? .pbRed : .pbSub))
        }
        if let status = v.registrationStatus {
            rows.append(Row(icon: "doc.text.fill", iconColor: .pbAccent, title: "Status", value: status))
        }
        return rows
    }
}

// MARK: - Ark (sheets) for profilhandlinger
private struct SheetScaffold<Content: View>: View {
    let title: String
    @Environment(\.dismiss) private var dismiss
    @ViewBuilder let content: () -> Content
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) { content() }
                    .padding(20)
            }
            .background(Color.pbBg.ignoresSafeArea())
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Lukk") { dismiss() } }
            }
        }
    }
}

struct EditContactSheet: View {
    @ObservedObject var state: AppState
    let onSaved: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var phone = ""
    @State private var error = ""
    @State private var busy = false

    var body: some View {
        SheetScaffold(title: "Kontaktinfo") {
            PBTextField(label: "Navn", placeholder: "Ola Nordmann", text: $name, contentType: .name, capitalization: .words)
            PBTextField(label: "Telefon (valgfritt)", placeholder: "+47 123 45 678", text: $phone, keyboard: .phonePad, contentType: .telephoneNumber)
            Text("E-postadressen (\(state.email)) kan ikke endres her.").font(.pb(.footnote)).foregroundColor(.pbSub)
            if !error.isEmpty { ErrorText(message: error) }
            PBPrimaryButton(title: busy ? "Lagrer …" : "Lagre", action: save).disabled(busy)
        }
        .onAppear { name = state.fullName; phone = state.phone ?? "" }
    }

    private func save() {
        let n = name.trimmingCharacters(in: .whitespaces)
        guard !n.isEmpty else { error = "Navn kan ikke være tomt."; announce(error); return }
        busy = true
        Task {
            if let message = await state.updateContact(name: n, phone: phone.trimmingCharacters(in: .whitespaces)) {
                error = message; announce(message)
            } else {
                onSaved(); announce("Kontaktinfo er lagret."); dismiss()
            }
            busy = false
        }
    }
}

struct ChangePasswordSheet: View {
    @ObservedObject var state: AppState
    let onSaved: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var password = ""
    @State private var repeatPassword = ""
    @State private var error = ""
    @State private var busy = false

    var body: some View {
        SheetScaffold(title: "Endre passord") {
            PBTextField(label: "Nytt passord (minst 8 tegn)", placeholder: "", text: $password, contentType: .newPassword, secure: true)
            PBTextField(label: "Gjenta passord", placeholder: "", text: $repeatPassword, contentType: .newPassword, secure: true)
            if !error.isEmpty { ErrorText(message: error) }
            PBPrimaryButton(title: busy ? "Lagrer …" : "Lagre passord", action: save).disabled(busy)
        }
    }

    private func save() {
        guard password.count >= 8 else { error = "Passordet må ha minst 8 tegn."; announce(error); return }
        guard password == repeatPassword else { error = "Passordene er ikke like."; announce(error); return }
        busy = true
        Task {
            if let message = await state.changePassword(password) {
                error = message; announce(message)
            } else {
                onSaved(); announce("Passordet er endret."); dismiss()
            }
            busy = false
        }
    }
}

struct DeleteAccountSheet: View {
    @ObservedObject var state: AppState
    @Environment(\.dismiss) private var dismiss
    @State private var confirmText = ""
    @State private var error = ""
    @State private var busy = false

    var body: some View {
        SheetScaffold(title: "Slett konto") {
            Text("Profilen, kjøretøyene og innloggingen din slettes for godt. Dette kan ikke angres.")
                .font(.pb(.body)).foregroundColor(.pbText)
            PBTextField(label: "Skriv SLETT for å bekrefte", placeholder: "SLETT", text: $confirmText, capitalization: .characters)
            if !error.isEmpty { ErrorText(message: error) }
            Button(action: delete) {
                Text(busy ? "Sletter …" : "Slett kontoen for godt")
                    .font(.pb(.callout, .semibold)).foregroundColor(.pbRed)
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .background(Color.pbRedBg).cornerRadius(12)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.pbRed, lineWidth: 1.5))
            }
            .disabled(busy)
        }
    }

    private func delete() {
        guard confirmText.trimmingCharacters(in: .whitespaces).uppercased() == "SLETT" else {
            error = "Skriv SLETT for å bekrefte."; announce(error); return
        }
        busy = true
        Task {
            if let message = await state.deleteAccount() {
                error = message; announce(message); busy = false
            } else {
                dismiss()
            }
        }
    }
}

struct PrivacySheet: View {
    private let sections: [(String, String)] = [
        ("Behandlingsansvarlig", "Parkeringsbot er behandlingsansvarlig for personopplysningene i tjenesten. Kontakt: parkeringsbot@outlook.com."),
        ("Hva vi lagrer", "Navn, e-post, telefonnummer (valgfritt), registreringsnummer på kjøretøyene dine og informasjon om parkeringsbøter (beløp, sted, dato, status)."),
        ("Hvorfor", "For å gi deg innlogging og vise bøtene som er registrert på skiltene dine (avtale, GDPR art. 6(1)(b))."),
        ("Lagring og sikkerhet", "Dataene lagres hos Supabase innenfor EØS og er kryptert. Du ser bare dine egne data."),
        ("Tredjeparter", "Supabase (database og innlogging), Vercel (nettsiden), Statens vegvesen (vi sender bare registreringsnummeret for å vise kjøretøyinfo) og Resend (e-postvarsler, hvis du har slått dem på)."),
        ("Dine rettigheter", "Du kan se og endre opplysningene dine under Profil, slå av e-postvarsler og slette kontoen selv. Da slettes profil, kjøretøy og innlogging med en gang."),
        ("Klage", "Du kan klage til Datatilsynet hvis du mener vi behandler opplysningene dine feil."),
    ]

    var body: some View {
        SheetScaffold(title: "Personvern") {
            Text("Personvernerklæring").font(.pb(.title2, .bold)).foregroundColor(.pbText).accessibilityAddTraits(.isHeader)
            ForEach(sections, id: \.0) { title, text in
                VStack(alignment: .leading, spacing: 4) {
                    Text(title).font(.pb(.headline)).foregroundColor(.pbText).accessibilityAddTraits(.isHeader)
                    Text(text).font(.pb(.body)).foregroundColor(.pbLabel)
                }
            }
            if let url = URL(string: "\(SupabaseConfig.siteURL)/personvern") {
                Link(destination: url) {
                    Label("Les hele erklæringen på nettsiden", systemImage: "arrow.up.right")
                        .font(.pb(.subheadline, .semibold)).foregroundColor(.pbAccent).frame(minHeight: 44)
                }
            }
        }
    }
}

struct ThemePickerRow: View {
    @AppStorage("appTheme") private var theme: AppTheme = .system
    @Environment(\.dynamicTypeSize) private var typeSize
    @ScaledMetric private var iconBox: CGFloat = 32

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 8).fill(Color.pbAccent.opacity(0.12))
                        .frame(width: min(iconBox, 48), height: min(iconBox, 48))
                    Image(systemName: "circle.lefthalf.filled").foregroundColor(.pbAccent).font(.pb(.subheadline))
                }
                Text("Utseende").font(.pb(.subheadline)).foregroundColor(.pbText)
            }
            .accessibilityHidden(true)

            if typeSize.isAccessibilitySize {
                Picker("Utseende", selection: $theme) {
                    ForEach(AppTheme.allCases) { Text($0.label).tag($0) }
                }
                .pickerStyle(.menu)
                .tint(.pbAccent)
            } else {
                Picker("Utseende", selection: $theme) {
                    ForEach(AppTheme.allCases) { Text($0.label).tag($0) }
                }
                .pickerStyle(.segmented)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct StatCard: View {
    let value: String
    let label: String
    let spokenValue: String
    var body: some View {
        VStack(spacing: 4) {
            Text(value).font(.pb(.headline, .bold)).foregroundColor(.pbText)
            Text(label).font(.pb(.caption)).foregroundColor(.pbSub).multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 14)
        .background(Color.pbCard).cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 3, y: 1)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(label): \(spokenValue)")
    }
}

struct ProfileSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionTitle(text: title).padding(.horizontal, 16)
            VStack(spacing: 0) { content() }
                .background(Color.pbCard).cornerRadius(14)
                .shadow(color: Color.black.opacity(0.05), radius: 3, y: 1)
                .padding(.horizontal, 16)
        }
    }
}

struct ProfileRow: View {
    let icon: String
    let iconColor: Color
    let title: String
    let value: String
    var valueColor: Color = .pbSub
    @Environment(\.dynamicTypeSize) private var typeSize
    @ScaledMetric private var iconBox: CGFloat = 32

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 8).fill(iconColor.opacity(0.12)).frame(width: min(iconBox, 48), height: min(iconBox, 48))
                Image(systemName: icon).foregroundColor(iconColor).font(.pb(.subheadline))
            }
            .accessibilityHidden(true)
            let layout = typeSize.isAccessibilitySize
                ? AnyLayout(VStackLayout(alignment: .leading, spacing: 2))
                : AnyLayout(HStackLayout())
            layout {
                Text(title).font(.pb(.subheadline)).foregroundColor(.pbText)
                if !typeSize.isAccessibilitySize { Spacer() }
                Text(value).font(.pb(.subheadline)).foregroundColor(valueColor)
                    .multilineTextAlignment(typeSize.isAccessibilitySize ? .leading : .trailing)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }
}

// MARK: - Shared: FineCard
struct FineCard: View {
    let fine: ParkingFine
    var detailed = false
    @Environment(\.dynamicTypeSize) private var typeSize
    @ScaledMetric private var iconBox: CGFloat = 44

    var body: some View {
        let layout = typeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 10))
            : AnyLayout(HStackLayout(spacing: 12))
        layout {
            ZStack {
                RoundedRectangle(cornerRadius: 10).fill(fine.status.bgColor).frame(width: min(iconBox, 64), height: min(iconBox, 64))
                Image(systemName: fine.status.icon).foregroundColor(fine.status.color).font(.pb(.title3))
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(fine.licensePlate).font(.pb(.subheadline, .bold)).foregroundColor(.pbText)
                Text(fine.location.isEmpty ? "Ukjent sted" : fine.location).font(.pb(.footnote)).foregroundColor(.pbSub)
                if !fine.date.isEmpty { Text(fine.date).font(.pb(.caption)).foregroundColor(.pbSub) }
            }
            if !typeSize.isAccessibilitySize { Spacer() }
            VStack(alignment: typeSize.isAccessibilitySize ? .leading : .trailing, spacing: 4) {
                Text(kr(fine.amount)).font(.pb(.subheadline, .bold)).foregroundColor(fine.status.color)
                Text(fine.status.label)
                    .font(.pb(.caption2, .semibold)).foregroundColor(fine.status.color)
                    .padding(.horizontal, 8).padding(.vertical, 2)
                    .background(fine.status.bgColor).cornerRadius(6)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if detailed { details }
        }
        .background(Color.pbCard).cornerRadius(14)
        .shadow(color: Color.black.opacity(0.06), radius: 4, y: 1)
        .padding(.horizontal, 16)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(fine.accessibilityText + (detailed && fine.reference != nil ? " Referanse \(fine.reference!)." : ""))
    }
}

private extension FineCard {
    var deadlineText: String {
        switch fine.status {
        case .paid:    return "Betalt"
        case .pending: return "Under behandling"
        case .unpaid:  return (fine.deadline ?? "Ikke satt") + (fine.isOverdue ? " (passert)" : "")
        }
    }

    var details: some View {
        VStack(alignment: .leading, spacing: 4) {
            Divider().padding(.bottom, 6)
            HStack(spacing: 4) {
                Text("Frist:").foregroundColor(.pbSub)
                Text(deadlineText).fontWeight(.semibold).foregroundColor(fine.isOverdue ? .pbRed : .pbText)
            }
            if let ref = fine.reference {
                HStack(spacing: 4) {
                    Text("Referanse:").foregroundColor(.pbSub)
                    Text(ref).fontWeight(.semibold).foregroundColor(.pbText)
                }
            }
            if fine.status != .paid {
                Text("Betaling i appen kommer snart.").foregroundColor(.pbSub)
            }
        }
        .font(.pb(.footnote))
        .padding(.horizontal, 14).padding(.bottom, 14)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Shared Components
struct PBTextField: View {
    let label: String
    let placeholder: String
    @Binding var text: String
    var keyboard: UIKeyboardType = .default
    var contentType: UITextContentType? = nil
    var capitalization: TextInputAutocapitalization = .sentences
    var secure = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.pb(.caption, .semibold)).foregroundColor(.pbLabel)
                .textCase(.uppercase).tracking(0.5)
                .accessibilityHidden(true)
            Group {
                if secure {
                    SecureField(label, text: $text, prompt: Text(placeholder).foregroundColor(.pbSub))
                } else {
                    TextField(label, text: $text, prompt: Text(placeholder).foregroundColor(.pbSub))
                }
            }
            .textFieldStyle(.plain).foregroundColor(.pbText).font(.pb(.body))
            .keyboardType(keyboard)
            .textContentType(contentType)
            .textInputAutocapitalization(capitalization)
            .autocorrectionDisabled(contentType != .name)
            .padding(13).frame(minHeight: 44)
            .background(Color.pbInputBg).cornerRadius(10)
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.pbInputBorder, lineWidth: 1.5))
        }
    }
}

struct PBPrimaryButton: View {
    let title: String; let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(title).font(.pb(.callout, .semibold)).foregroundColor(.white)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity, minHeight: 44).padding(.vertical, 6).padding(.horizontal, 15)
                .background(LinearGradient(colors: [.pbBlue, .pbBlue2], startPoint: .leading, endPoint: .trailing))
                .cornerRadius(12).shadow(color: Color.pbBlue.opacity(0.4), radius: 8, y: 4)
        }
        .buttonStyle(ScaleButtonStyle()).padding(.top, 4)
    }
}

struct ScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        ScaleButtonBody(configuration: configuration)
    }

    private struct ScaleButtonBody: View {
        let configuration: ButtonStyleConfiguration
        @Environment(\.accessibilityReduceMotion) private var reduceMotion
        var body: some View {
            configuration.label
                .scaleEffect(configuration.isPressed && !reduceMotion ? 0.98 : 1.0)
                .opacity(configuration.isPressed && reduceMotion ? 0.85 : 1.0)
                .animation(reduceMotion ? nil : .easeInOut(duration: 0.1), value: configuration.isPressed)
        }
    }
}

#Preview { ContentView() }
