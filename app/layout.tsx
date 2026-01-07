export const metadata = {
  title: 'SDBA Registration System',
  description: 'Stanley Dragon Boat Association Registration System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

