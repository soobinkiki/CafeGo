using CafeGo.Api.Services;
var builder=WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddHttpClient<GooglePlacesService>();
builder.Services.AddCors(o=>o.AddPolicy("local",p=>p.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));
var app=builder.Build();app.UseCors("local");app.MapControllers();app.Run();
