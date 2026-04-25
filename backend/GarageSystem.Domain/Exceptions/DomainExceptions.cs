namespace GarageSystem.Domain.Exceptions;

public class NotFoundException : Exception
{
    public NotFoundException(string entityName, object id)
        : base($"{entityName} avec l'identifiant '{id}' est introuvable.") { }
}

public class BusinessRuleException : Exception
{
    public BusinessRuleException(string message) : base(message) { }
}

public class ConflictException : Exception
{
    public ConflictException(string message) : base(message) { }
}
