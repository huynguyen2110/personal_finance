import LoginForm from './LoginForm';

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { from } = await searchParams;
  return <LoginForm from={typeof from === 'string' ? from : undefined} />;
}
