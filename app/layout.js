export const metadata = {
  title: 'Comment Automation',
  description: 'Instagram comment-to-DM automation',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#f9fafb', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  );
}
