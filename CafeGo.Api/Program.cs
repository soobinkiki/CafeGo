using CafeGo.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Controllers
builder.Services.AddControllers();

// Google Places service
builder.Services.AddHttpClient<GooglePlacesService>();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("CafeGoFrontend", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173",
                "https://cafe-go-swart.vercel.app"
            )
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

// CORS must run before MapControllers
app.UseCors("CafeGoFrontend");

app.MapControllers();

app.Run();