import { useState } from 'react'
import { User, Briefcase, ChevronDown, ChevronUp } from 'lucide-react'

interface AccordionItemProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  headerRight?: React.ReactNode
}

const AccordionItem: React.FC<AccordionItemProps> = ({ 
  title, 
  icon, 
  children, 
  defaultOpen = false,
  headerRight 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="bg-card rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] border border-gray-100">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-xl"
      >
        <div className="flex items-center space-x-4">
          <div className="flex items-center justify-center w-8 h-8 bg-secondary rounded-full">
            {icon}
          </div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {headerRight && !isOpen && <div className="flex items-center">{headerRight}</div>}
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-muted" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted" />
          )}
        </div>
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  )
}

interface Person {
  name: string
  reason: string
  avatar: string
}

const people: Person[] = [
  {
    name: "Default Persona",
    reason: "Because of AI training.",
    avatar: "D",
  },
  {
    name: "Expert Persona",
    reason: "Because of specialized knowledge.",
    avatar: "E",
  },
  {
    name: "Assistant Persona",
    reason: "Because of helpful responses.",
    avatar: "A",
  },
  {
    name: "Creative Persona",
    reason: "Because of innovative thinking.",
    avatar: "C",
  },
  {
    name: "Analyst Persona",
    reason: "Because of data insights.",
    avatar: "A",
  },
]

const RightSidebar = () => {
  return (
    <aside className="w-[380px] flex-shrink-0 space-y-2">
      <div className="space-y-2">
        <AccordionItem
          title="About"
          icon={<User className="h-5 w-5 text-muted-foreground" />}
          defaultOpen={true}
        >
          <p className="text-sm text-muted leading-relaxed">
            I'm an AI persona powered by Monks.IQ, designed to provide contextual and 
            personalized responses based on training data and insights. I can engage in 
            conversations, answer questions, and help with various tasks while maintaining 
            the personality and knowledge of my trained persona.
          </p>
        </AccordionItem>

        <AccordionItem
          title="Knowledge Base"
          icon={<Briefcase className="h-5 w-5 text-muted-foreground" />}
          headerRight={
            <div className="flex -space-x-3 mr-2">
              <div className="w-7 h-7 rounded-full bg-blue-500 border-2 border-card flex items-center justify-center text-white text-xs font-semibold">
                AI
              </div>
              <div className="w-7 h-7 rounded-full bg-green-500 border-2 border-card flex items-center justify-center text-white text-xs font-semibold">
                ML
              </div>
              <div className="w-7 h-7 rounded-full bg-purple-500 border-2 border-card flex items-center justify-center text-white text-xs font-semibold">
                NLP
              </div>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted">Training Data</span>
              <span className="text-sm font-medium text-foreground">12k insights</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted">Embeddings</span>
              <span className="text-sm font-medium text-foreground">Active</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted">Last Updated</span>
              <span className="text-sm font-medium text-foreground">Today</span>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem
          title="Other Engagements"
          icon={<Briefcase className="h-5 w-5 text-muted-foreground" />}
          headerRight={
            <div className="w-7 h-7 rounded-full bg-orange-500 border-2 border-card flex items-center justify-center text-white text-xs font-semibold">
              M
            </div>
          }
        >
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-semibold">
                M
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Monks.IQ Platform</p>
                <p className="text-xs text-muted">AI Development & Training</p>
              </div>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem
          title="Timeline"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
            </svg>
          }
          defaultOpen={true}
        >
          <p className="text-base text-muted text-center pt-2">
            No items in the timeline
          </p>
        </AccordionItem>
      </div>

      <div className="space-y-4 py-4">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider px-4">
          AVAILABLE PERSONAS
        </h3>
        <div className="space-y-4">
          {people.map((person) => (
            <div key={person.name} className="flex items-center space-x-3 px-4 hover:bg-gray-50 rounded-lg py-2 transition-colors cursor-pointer">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                {person.avatar}
              </div>
              <div className="flex-grow">
                <p className="font-semibold text-sm text-foreground">{person.name}</p>
                <p className="text-xs text-muted">{person.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

export default RightSidebar
