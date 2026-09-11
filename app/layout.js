import "./globals.css";

export const metadata = {
  title: {
    default: "Threadly",
    template: "%s · Threadly"
  },
  description: "Share ideas, photos, and conversations with your community."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
