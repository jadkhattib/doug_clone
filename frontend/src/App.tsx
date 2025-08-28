
import Header from './components/Header'
import ProfileHero from './components/ProfileHero'
import ChatInterface from './components/ChatInterface'

function App() {
  return (
    <div className="min-h-screen bg-[#f5f4f0]">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-center">
          {/* Centered Content Area */}
          <div className="w-full max-w-[768px]">
            <ProfileHero />
            <ChatInterface />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App