import Header from '@/components/shared/header';

const PublicLayout = ({ children }: IChildren) => {
  return (
    <main className="min-h-screen flex flex-col overflow-x-hidden hide-scrollbar relative">
      <Header />
      <div className="w-full bg-transparent grow">{children}</div>
    </main>
  );
};

export default PublicLayout;
