RubyCCJS::Application.routes.draw do
  get '/breeze/Metadata', to: 'breeze/settings#metadata'
  get '/breeze/Lookups',  to: 'breeze/settings#lookups'
  namespace :breeze do
    resources :Sessions, controller: 'sessions'
    resources :Speakers, controller: 'speakers'
  end
end
