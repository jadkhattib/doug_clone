// Removed unused icons

const ProfileHero = () => {
  return (
    <div className="bg-card rounded-3xl shadow-sm w-full font-sans">
      <div className="h-[96px] rounded-t-3xl relative">
        {/* Removed follow, share, and more buttons */}
      </div>

      <div className="px-6 pb-8 text-center">
        <div className="w-[120px] h-[120px] mx-auto -mt-[60px] rounded-full border-4 border-background relative z-10 overflow-hidden">
          <img 
            src="/doug-martin.jpeg" 
            alt="Doug Martin IQ" 
            className="w-full h-full object-cover"
          />
        </div>

        <div className="mt-4">
          <h1 className="text-profile-name">Doug Martin IQ</h1>
          <p className="text-profile-description max-w-2xl mx-auto mt-2 leading-snug">
            An AI clone of Doug Martin curated to respond to general inquires about the mannequin king.
          </p>
        </div>

        {/* Removed all stats including insights, conversations, active personas, and powered by */}
      </div>
    </div>
  )
}

export default ProfileHero
