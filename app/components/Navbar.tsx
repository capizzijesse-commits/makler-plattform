import Link from "next/link";

export default function Navbar() {
  return (
    <header className="siteNavbar">
      <div className="siteNavbarInner">
        <Link href="/" className="siteBrand">
          <span className="siteBrandIcon" aria-hidden="true">
            <span className="siteBrandRoof" />
            <span className="siteBrandLine siteBrandLineOne" />
            <span className="siteBrandLine siteBrandLineTwo" />
            <span className="siteBrandLine siteBrandLineThree" />
          </span>

          <span className="siteBrandText">Inserat-AI</span>
        </Link>

        <nav className="siteNavActions">
          <Link href="/login" className="siteLoginLink">
            Login
          </Link>

          <Link href="/register" className="siteCtaButton">
            Kostenlos testen
            <span aria-hidden="true">→</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}