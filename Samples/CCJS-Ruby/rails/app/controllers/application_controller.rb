# Application Controller Class
#
# General use controller
class ApplicationController < ActionController::API

  # Include MIME Responds module
  include ActionController::MimeResponds

  # Send respons in JSON format by default
  respond_to :json

  # Default action for Record Not Found
  rescue_from ActiveRecord::RecordNotFound, :with => :not_found

  # Set up Rack CORS
  use Rack::Cors do
    allow do
      origins 'localhost:3000', '127.0.0.1:3000',
              /http:\/\/192\.168\.0\.\d{1,3}(:\d+)?/
              # regular expressions can be used here

      resource '/file/list_all/', :headers => 'x-domain-token'
      resource '/file/at/*',
          :methods => [:get, :post, :put, :delete, :options],
          :headers => 'x-domain-token',
          :expose  => ['Some-Custom-Response-Header'],
          :max_age => 600
          # headers to expose
    end

    allow do
      origins '*'
      resource '/public/*', :headers => :any, :methods => :get
    end
  end

  private

    # Responds with a Not Found error and proper HTTP code
    def not_found
      render(:json => {errors: ['Not Found']}, :status => 404)
    end

    # Get the records order from request
    def get_order(default = '')
      result = Array.new
      order = params['$orderby'].blank? ? default : params['$orderby']
      order.split(',').each do |attribute|
        if (parts = attribute.split('/')).size > 1
          parts[0] = parts[0].pluralize
          attribute = parts.join('.')
        end
        result << attribute
      end
      result.join(',')
    end

    # Get record attributes from request
    def get_selected_attributes(model)
      select = params['$select'].blank? ? model.constantize.column_names : params['$select'].split(',')
      select.map{|attr| attr.to_sym}
    end

end
