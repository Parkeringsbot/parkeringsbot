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
struct ParkingFine: Identifiable {
    let id = UUID()
    let licensePlate: String
    let location: String
    let amount: Int
    let date: String
    var status: FineStatus

    var accessibilityText: String {
        "\(status.label), \(amount) kroner. \(location), \(date). Registreringsnummer \(licensePlate)."
    }
}

enum FineStatus: CaseIterable {
    case unpaid, paid, pending
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

// MARK: - App State
class AppState: ObservableObject {
    @Published var isLoggedIn = false
    @Published var isNewUser  = false
    @Published var userName   = ""
    @Published var userEmail  = "khadar@epost.no"
    @Published var userPhone  = "+47 900 00 000"
    @Published var licensePlate = "AB 12345"
    @Published var fines: [ParkingFine] = [
        ParkingFine(licensePlate: "AB 12345", location: "Karl Johans gt.", amount: 900,  date: "15. sep 2026", status: .unpaid),
        ParkingFine(licensePlate: "AB 12345", location: "Grünerløkka",    amount: 750,  date: "10. sep 2026", status: .unpaid),
        ParkingFine(licensePlate: "AB 12345", location: "Vippetangen",    amount: 750,  date: "5. sep 2026",  status: .pending),
        ParkingFine(licensePlate: "AB 12345", location: "Majorstuen",     amount: 600,  date: "12. aug 2026", status: .paid)
    ]

    enum VehicleLoadState: Equatable {
        case idle, loading, loaded(VehicleInfo), failed(String)
    }
    @Published var vehicleState: VehicleLoadState = .idle
    private let vegvesen = VegvesenAPI()

    @MainActor
    func loadVehicle() async {
        vehicleState = .loading
        do {
            let vehicle = try await vegvesen.vehicle(licensePlate: licensePlate)
            licensePlate = vehicle.licensePlate
            vehicleState = .loaded(vehicle)
        } catch {
            let message = (error as? LocalizedError)?.errorDescription ?? "Noe gikk galt. Prøv igjen."
            vehicleState = .failed(message)
            announce(message)
        }
    }

    func logout() {
        isLoggedIn   = false
        isNewUser    = false
        userName     = ""
        vehicleState = .idle
    }
}

// MARK: - Root
struct ContentView: View {
    @StateObject var state = AppState()
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @AppStorage("appTheme") private var theme: AppTheme = .system

    var body: some View {
        Group {
            if state.isLoggedIn {
                DashboardView(state: state)
            } else if state.isNewUser {
                RegisterView(state: state)
            } else {
                LoginView(state: state)
            }
        }
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.2), value: state.isLoggedIn)
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.2), value: state.isNewUser)
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
            Text("🅿️").font(.system(size: size * 0.47))
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

private struct ErrorText: View {
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

// MARK: - Login
struct LoginView: View {
    @ObservedObject var state: AppState
    @State private var licensePlate = ""
    @State private var bankIDCode   = ""
    @State private var errorMessage = ""

    var body: some View {
        AuthScreen {
            VStack(spacing: 10) {
                AuthLogo(size: 72)
                Text("Parkeringsbot").font(.pb(.title, .bold)).foregroundColor(.white)
                    .accessibilityAddTraits(.isHeader)
                Text("Håndter dine bøter enkelt og digitalt")
                    .font(.pb(.footnote)).foregroundColor(.white.opacity(0.75)).multilineTextAlignment(.center)
            }
            .padding(.bottom, 32).padding(.horizontal, 24)

            VStack(spacing: 14) {
                PBTextField(label: "Registreringsnummer", placeholder: "AB 12345", text: $licensePlate,
                            keyboard: .asciiCapable, capitalization: .characters)
                PBTextField(label: "BankID-kode", placeholder: "••••••", text: $bankIDCode,
                            keyboard: .numberPad, secure: true)
                if !errorMessage.isEmpty { ErrorText(message: errorMessage) }
                PBPrimaryButton(title: "Logg inn med BankID", action: login)
            }
            .padding(20).background(Color.pbCard).cornerRadius(20).padding(.horizontal, 24)

            Button(action: { state.isNewUser = true }) {
                ViewThatFits {
                    HStack(spacing: 4) { noAccountText; createAccountText }
                    VStack(spacing: 2) { noAccountText; createAccountText }
                }
                .font(.pb(.footnote))
                .frame(minHeight: 44)
                .padding(.horizontal, 24)
            }
            .padding(.top, 12)
            .accessibilityLabel("Opprett konto gratis")
            .accessibilityHint("Har du ikke konto? Gå til registrering.")
        }
    }

    private var noAccountText: some View { Text("Har du ikke konto?").foregroundColor(.white.opacity(0.75)) }
    private var createAccountText: some View { Text("Opprett konto gratis").foregroundColor(.pbLink).fontWeight(.semibold) }

    func login() {
        guard !licensePlate.isEmpty, !bankIDCode.isEmpty else {
            errorMessage = "Registreringsnummer og BankID-kode er påkrevd"
            announce(errorMessage)
            return
        }
        state.userName = "Khadar"
        state.licensePlate = licensePlate
        state.isLoggedIn = true
    }
}

// MARK: - Register
struct RegisterView: View {
    @ObservedObject var state: AppState
    @State private var fullName     = ""
    @State private var email        = ""
    @State private var phone        = ""
    @State private var licensePlate = ""
    @State private var errorMessage = ""

    var body: some View {
        AuthScreen {
            VStack(spacing: 10) {
                AuthLogo(size: 64)
                Text("Opprett konto").font(.pb(.title2, .bold)).foregroundColor(.white)
                    .accessibilityAddTraits(.isHeader)
            }
            .padding(.bottom, 24)

            VStack(spacing: 14) {
                PBTextField(label: "Fullt navn", placeholder: "Fornavn og etternavn", text: $fullName,
                            contentType: .name, capitalization: .words)
                PBTextField(label: "E-post", placeholder: "din@epost.no", text: $email,
                            keyboard: .emailAddress, contentType: .emailAddress, capitalization: .never)
                PBTextField(label: "Telefonnummer", placeholder: "+47 000 00 000", text: $phone,
                            keyboard: .phonePad, contentType: .telephoneNumber)
                PBTextField(label: "Registreringsnummer", placeholder: "AB 12345", text: $licensePlate,
                            keyboard: .asciiCapable, capitalization: .characters)
                if !errorMessage.isEmpty { ErrorText(message: errorMessage) }
                PBPrimaryButton(title: "Opprett konto", action: register)
            }
            .padding(20).background(Color.pbCard).cornerRadius(20).padding(.horizontal, 24)

            Button(action: { state.isNewUser = false }) {
                Text("Tilbake til innlogging").font(.pb(.footnote)).foregroundColor(.white.opacity(0.75))
                    .frame(minHeight: 44).padding(.horizontal, 24)
            }
            .padding(.top, 12)
        }
    }

    func register() {
        guard !fullName.isEmpty, !email.isEmpty, !phone.isEmpty, !licensePlate.isEmpty else {
            errorMessage = "Alle felt må fylles ut"
            announce(errorMessage)
            return
        }
        state.userName      = fullName.components(separatedBy: " ").first ?? fullName
        state.userEmail     = email
        state.userPhone     = phone
        state.licensePlate  = licensePlate
        state.isNewUser     = false
        state.isLoggedIn    = true
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
        .task { await state.loadVehicle() }
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
                        Text("\(state.userName) 👋")
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
                            Text("\(totalUnpaid) kr").font(.pb(.title, .heavy)).foregroundColor(.white)
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
                    ForEach(state.fines) { fine in FineCard(fine: fine) }
                    Spacer().frame(height: 8)
                }
            }
        }
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
                            Text("Ingen bøter her").font(.pb(.subheadline, .medium)).foregroundColor(.pbSub)
                        }
                        .frame(maxWidth: .infinity).padding(.top, 80)
                    } else {
                        ForEach(filtered) { fine in FineCard(fine: fine) }
                    }
                    Spacer().frame(height: 8)
                }
                .padding(.top, 12)
            }
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
    @State private var showLogoutConfirm = false
    @ScaledMetric private var avatarSize: CGFloat = 72

    var totalPaid: Int { state.fines.filter { $0.status == .paid }.reduce(0) { $0 + $1.amount } }
    var totalFines: Int { state.fines.count }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(LinearGradient(colors: [.pbBlue, .pbBlue2], startPoint: .topLeading, endPoint: .bottomTrailing))
                            .frame(width: avatarSize, height: avatarSize)
                        Text(state.userName.prefix(1).uppercased())
                            .font(.pb(.title, .bold)).foregroundColor(.white)
                    }
                    .accessibilityHidden(true)
                    Text(state.userName).font(.pb(.headline, .bold)).foregroundColor(.white)
                        .accessibilityAddTraits(.isHeader)
                    Text(state.userEmail).font(.pb(.footnote)).foregroundColor(.white.opacity(0.75))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 24).padding(.horizontal, 16)
                .background(Color.pbNavy)

                VStack(spacing: 16) {
                    // Stats
                    ViewThatFits {
                        HStack(spacing: 12) { stats }
                        VStack(spacing: 12) { stats }
                    }
                    .padding(.horizontal, 16)

                    VehicleSection(state: state)

                    ProfileSection(title: "Kontaktinfo") {
                        ProfileRow(icon: "envelope.fill", iconColor: .pbAccent, title: "E-post", value: state.userEmail)
                        Divider().padding(.leading, 52)
                        ProfileRow(icon: "phone.fill", iconColor: .pbAccent, title: "Telefon", value: state.userPhone)
                    }

                    ProfileSection(title: "Innstillinger") {
                        ThemePickerRow()
                        Divider().padding(.leading, 52)
                        ProfileRow(icon: "bell.fill", iconColor: .pbOrange, title: "Varsler", value: "På")
                        Divider().padding(.leading, 52)
                        ProfileRow(icon: "lock.fill", iconColor: .pbGreen, title: "BankID", value: "Aktiv")
                    }

                    // Logg ut
                    Button(action: { showLogoutConfirm = true }) {
                        HStack {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                                .foregroundColor(.pbRed).font(.pb(.callout))
                                .frame(width: 32)
                                .accessibilityHidden(true)
                            Text("Logg ut").font(.pb(.subheadline, .medium)).foregroundColor(.pbRed)
                            Spacer()
                        }
                        .padding(16).frame(minHeight: 44)
                        .background(Color.pbCard).cornerRadius(14)
                        .shadow(color: Color.black.opacity(0.06), radius: 4, y: 1)
                    }
                    .padding(.horizontal, 16)

                    Spacer().frame(height: 8)
                }
                .padding(.top, 16)
            }
        }
        .refreshable { await state.loadVehicle() }
        .navyStatusBarBackground()
        .confirmationDialog("Er du sikker?", isPresented: $showLogoutConfirm, titleVisibility: .visible) {
            Button("Logg ut", role: .destructive) { state.logout() }
            Button("Avbryt", role: .cancel) {}
        }
    }

    @ViewBuilder private var stats: some View {
        StatCard(value: "\(totalFines)", label: "Totalt bøter", spokenValue: "\(totalFines)")
        StatCard(value: "\(totalPaid) kr", label: "Betalt totalt", spokenValue: "\(totalPaid) kroner")
    }
}

// MARK: - Kjøretøy (fra Statens vegvesen)
private let longDateFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "nb_NO")
    formatter.dateStyle = .long
    return formatter
}()

struct VehicleSection: View {
    @ObservedObject var state: AppState

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ProfileSection(title: "Kjøretøy") {
                ProfileRow(icon: "car.fill", iconColor: .pbAccent, title: "Registreringsnummer", value: state.licensePlate)

                switch state.vehicleState {
                case .idle, .loading:
                    Divider().padding(.leading, 52)
                    HStack(spacing: 12) {
                        ProgressView()
                        Text("Henter info fra Statens vegvesen …")
                            .font(.pb(.subheadline)).foregroundColor(.pbSub)
                    }
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .accessibilityElement(children: .combine)

                case .loaded(let vehicle):
                    ForEach(rows(for: vehicle), id: \.title) { row in
                        Divider().padding(.leading, 52)
                        ProfileRow(icon: row.icon, iconColor: row.iconColor, title: row.title,
                                   value: row.value, valueColor: row.valueColor)
                    }

                case .failed(let message):
                    Divider().padding(.leading, 52)
                    VStack(alignment: .leading, spacing: 8) {
                        ErrorText(message: message)
                        Button {
                            Task { await state.loadVehicle() }
                        } label: {
                            Label("Prøv igjen", systemImage: "arrow.clockwise")
                                .font(.pb(.subheadline, .semibold))
                                .foregroundColor(.pbAccent)
                                .frame(minHeight: 44)
                        }
                    }
                    .padding(.horizontal, 14).padding(.top, 10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }

            if case .loaded = state.vehicleState {
                Text("Kilde: Statens vegvesen")
                    .font(.pb(.caption)).foregroundColor(.pbSub)
                    .padding(.horizontal, 20)
            }
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
            rows.append(Row(icon: "calendar", iconColor: .pbAccent, title: "Først registrert",
                            value: longDateFormatter.string(from: date)))
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
                Text(fine.location).font(.pb(.footnote)).foregroundColor(.pbSub)
                Text(fine.date).font(.pb(.caption)).foregroundColor(.pbSub)
            }
            if !typeSize.isAccessibilitySize { Spacer() }
            VStack(alignment: typeSize.isAccessibilitySize ? .leading : .trailing, spacing: 4) {
                Text("\(fine.amount) kr").font(.pb(.subheadline, .bold)).foregroundColor(fine.status.color)
                Text(fine.status.label)
                    .font(.pb(.caption2, .semibold)).foregroundColor(fine.status.color)
                    .padding(.horizontal, 8).padding(.vertical, 2)
                    .background(fine.status.bgColor).cornerRadius(6)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.pbCard).cornerRadius(14)
        .shadow(color: Color.black.opacity(0.06), radius: 4, y: 1)
        .padding(.horizontal, 16)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(fine.accessibilityText)
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
